import { FastifyInstance } from 'fastify';
import { google } from 'googleapis';

const getOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://appealing-reflection-production-7fbc.up.railway.app/api/gmail/callback'
  );
};

export default async function gmailRoutes(fastify: FastifyInstance) {

  fastify.get('/auth', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const oauth2Client = getOAuthClient();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state: user.organizationId,
    });

    return { url: authUrl };
  });

  fastify.get('/callback', async (request: any, reply: any) => {
    const { code, state: organizationId } = request.query as any;

    if (!code || !organizationId) {
      return reply.status(400).send({ message: 'Missing code or state' });
    }

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
      data: {
        gmailAccessToken: null,
        gmailRefreshToken: null,
        gmailTokenExpiry: null,
        gmailEmail: null,
        gmailConnected: false,
      },
    });
    return { success: true };
  });
}

export async function checkGmailForOrg(org: any, fastify: any) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://appealing-reflection-production-7fbc.up.railway.app/api/gmail/callback'
  );

  oauth2Client.setCredentials({
    access_token: org.gmailAccessToken,
    refresh_token: org.gmailRefreshToken,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread in:inbox',
    maxResults: 20,
  });

  const messages = response.data.messages || [];

  for (const msg of messages) {
    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    });

    const headers = full.data.payload?.headers || [];
    const from = headers.find(h => h.name === 'From')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';

    const emailMatch = from.match(/<(.+)>/) || [null, from];
    const fromEmail = emailMatch[1]?.trim() || from;
    const fromName = from.replace(/<.+>/, '').trim() || fromEmail;

    if (!fromEmail) continue;
    if (fromEmail.toLowerCase() === org.gmailEmail?.toLowerCase()) continue;

    await gmail.users.messages.modify({
      userId: 'me',
      id: msg.id!,
      requestBody: { removeLabelIds: ['UNREAD'] },
    });

    let customer = await fastify.prisma.customer.findFirst({
      where: { email: fromEmail, organizationId: org.id },
    });

    if (!customer) {
      customer = await fastify.prisma.customer.create({
        data: {
          name: fromName || fromEmail,
          email: fromEmail,
          status: 'ACTIVE',
          organizationId: org.id,
        },
      });
    }

    const existing = await fastify.prisma.ticket.findFirst({
      where: {
        organizationId: org.id,
        subject,
        customerId: customer.id,
        source: 'EMAIL',
        createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });

    if (existing) continue;

    const ticket = await fastify.prisma.ticket.create({
      data: {
        subject,
        description: `Email from ${fromName} <${fromEmail}>`,
        status: 'OPEN',
        priority: 'MEDIUM',
        source: 'EMAIL',
        organizationId: org.id,
        customerId: customer.id,
      },
    });

    await fastify.prisma.message.create({
      data: {
        body: `Email from ${fromName} <${fromEmail}>:\n\nSubject: ${subject}`,
        senderType: 'CUSTOMER',
        ticketId: ticket.id,
      },
    });

    console.log(`New ticket from Gmail: ${subject} — org: ${org.name}`);
  }
}

export async function startGmailPoller(fastify: any) {
  console.log('Starting Gmail poller...');

  const poll = async () => {
    try {
      const orgs = await fastify.prisma.organization.findMany({
        where: { gmailConnected: true, gmailAccessToken: { not: null } },
      });

      for (const org of orgs) {
        try {
          await checkGmailForOrg(org, fastify);
        } catch (err: any) {
          console.error(`Gmail poll error for org ${org.name}:`, err.message);
        }
      }
    } catch (err) {
      console.error('Gmail poller error:', err);
    }
  };

  setTimeout(async () => {
    await poll();
    setInterval(poll, 60 * 1000);
  }, 15000);
}
