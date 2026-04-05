import { FastifyInstance } from 'fastify';
import { google } from 'googleapis';

const REDIRECT_URI = 'https://appealing-reflection-production-7fbc.up.railway.app/api/gmail/callback';

const getOAuthClient = () => new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

export default async function gmailRoutes(fastify: FastifyInstance) {

  fastify.get('/auth', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const oauth2Client = getOAuthClient();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      redirect_uri: REDIRECT_URI,
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state: user.organizationId,
    });
    return { url: authUrl };
  });

  fastify.get('/callback', async (request: any, reply: any) => {
    const { code, state: organizationId } = request.query as any;
    if (!code || !organizationId) return reply.status(400).send({ message: 'Missing code or state' });
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    await fastify.prisma.organization.update({
      where: { id: organizationId },
      data: {
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token,
        gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        gmailEmail: data.email,
        gmailConnected: true,
      },
    });
    return reply.redirect('https://dashboard-starter-self.vercel.app?gmailConnected=true');
  });

  fastify.get('/status', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const org = await fastify.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { gmailEmail: true, gmailConnected: true },
    });
    return org;
  });

  fastify.post('/disconnect', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    await fastify.prisma.organization.update({
      where: { id: user.organizationId },
      data: { gmailAccessToken: null, gmailRefreshToken: null, gmailTokenExpiry: null, gmailEmail: null, gmailConnected: false },
    });
    return { success: true };
  });

  fastify.post('/sync', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const org = await fastify.prisma.organization.findUnique({ where: { id: user.organizationId } });
    if (!org?.gmailConnected || !org?.gmailAccessToken) return reply.status(400).send({ error: 'Gmail not connected' });
    await checkGmailForOrg(org, fastify);
    return { success: true };
  });

}

export async function checkGmailForOrg(org: any, fastify: any) {
  try {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
      access_token: org.gmailAccessToken,
      refresh_token: org.gmailRefreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread in:inbox',
      maxResults: 5,
    });

    const messages = listRes.data.messages || [];
    console.log(`Gmail: ${messages.length} unread for ${org.gmailEmail}`);

    for (const msg of messages) {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Message-ID'],
      });

      const headers = full.data.payload?.headers || [];
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
      const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value || '';
      const threadId = full.data.threadId || '';

      const emailMatch = from.match(/<(.+)>/) || [null, from];
      const fromEmail = (emailMatch[1] || from).trim();
      const fromName = from.replace(/<.+>/, '').trim() || fromEmail;

      if (!fromEmail || fromEmail.toLowerCase() === org.gmailEmail?.toLowerCase()) {
        await gmail.users.messages.modify({
          userId: 'me', id: msg.id!,
          requestBody: { removeLabelIds: ['UNREAD'] },
        });
        continue;
      }

      await gmail.users.messages.modify({
        userId: 'me', id: msg.id!,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });

      const existingTicket = await fastify.prisma.ticket.findFirst({
        where: { organizationId: org.id, emailThreadId: threadId },
      });

      if (existingTicket) {
        await fastify.prisma.message.create({
          data: { body: `Reply from ${fromName} <${fromEmail}>`, senderType: 'CUSTOMER', ticketId: existingTicket.id },
        });
        console.log(`Reply added to ticket: ${existingTicket.subject}`);
        continue;
      }

      let customer = await fastify.prisma.customer.findFirst({
        where: { email: fromEmail, organizationId: org.id },
      });
      if (!customer) {
        customer = await fastify.prisma.customer.create({
          data: { name: fromName || fromEmail, email: fromEmail, status: 'ACTIVE', organizationId: org.id },
        });
      }

      const ticket = await fastify.prisma.ticket.create({
        data: {
          subject,
          description: `Email from ${fromName} <${fromEmail}>`,
          status: 'OPEN',
          priority: 'MEDIUM',
          source: 'EMAIL',
          emailThreadId: threadId,
          emailMessageId: messageId,
          organizationId: org.id,
          customerId: customer.id,
        },
      });

      await fastify.prisma.message.create({
        data: { body: `Email from ${fromName} <${fromEmail}>:\n\nSubject: ${subject}`, senderType: 'CUSTOMER', ticketId: ticket.id },
      });

      console.log(`New ticket: ${subject} — org: ${org.name}`);
    }
  } catch (err: any) {
    console.error(`Gmail error:`, err.message);
  }
}

export async function startGmailPoller(fastify: any) {
  console.log('Starting Gmail poller...');
  const poll = async () => {
    try {
      const orgs = await fastify.prisma.organization.findMany({
        where: { gmailConnected: true, gmailAccessToken: { not: null } },
        select: { id: true, name: true, gmailEmail: true, gmailAccessToken: true, gmailRefreshToken: true },
      });
      for (const org of orgs) {
        await checkGmailForOrg(org, fastify);
      }
    } catch (err: any) {
      console.error('Poller error:', err.message);
    }
  };
  setTimeout(async () => {
    await poll();
    setInterval(poll, 60 * 1000);
  }, 15000);
}
