import { FastifyInstance } from 'fastify';

const REDIRECT_URI = 'https://appealing-reflection-production-7fbc.up.railway.app/api/gmail/callback';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

const getAuthUrl = (state: string) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.email',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
};

const getTokens = async (code: string) => {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' }),
  });
  return res.json();
};

const getUserEmail = async (accessToken: string) => {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
};

const gmailFetch = async (accessToken: string, path: string, options: any = {}) => {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
  return res.json();
};

export default async function gmailRoutes(fastify: FastifyInstance) {

  fastify.get('/auth', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    return { url: getAuthUrl(user.organizationId) };
  });

  fastify.get('/callback', async (request: any, reply: any) => {
    const { code, state: organizationId } = request.query as any;
    if (!code || !organizationId) return reply.status(400).send({ message: 'Missing code or state' });

    const tokens = await getTokens(code);
    const userInfo = await getUserEmail(tokens.access_token);

    await fastify.prisma.organization.update({
      where: { id: organizationId },
      data: {
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token,
        gmailTokenExpiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        gmailEmail: userInfo.email,
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
    const listData = await gmailFetch(org.gmailAccessToken, '/messages?maxResults=5&q=is:unread+in:inbox');
    const messages = listData.messages || [];
    console.log(`Gmail: ${messages.length} unread for ${org.gmailEmail}`);

    for (const msg of messages) {
      const full = await gmailFetch(org.gmailAccessToken, `/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Message-ID`);

      const headers = full.payload?.headers || [];
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
      const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value || '';
      const threadId = full.threadId || '';

      const emailMatch = from.match(/<(.+)>/) || [null, from];
      const fromEmail = (emailMatch[1] || from).trim();
      const fromName = from.replace(/<.+>/, '').trim() || fromEmail;

      if (!fromEmail || fromEmail.toLowerCase() === org.gmailEmail?.toLowerCase()) {
        await gmailFetch(org.gmailAccessToken, `/messages/${msg.id}/modify`, {
          method: 'POST',
          body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
        });
        continue;
      }

      await gmailFetch(org.gmailAccessToken, `/messages/${msg.id}/modify`, {
        method: 'POST',
        body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
      });

      const existingTicket = await fastify.prisma.ticket.findFirst({
        where: { organizationId: org.id, emailThreadId: threadId },
      });

      if (existingTicket) {
        await fastify.prisma.message.create({
          data: { body: `Reply from ${fromName} <${fromEmail}>`, senderType: 'CUSTOMER', ticketId: existingTicket.id },
        });
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
          subject, description: `Email from ${fromName} <${fromEmail}>`,
          status: 'OPEN', priority: 'MEDIUM', source: 'EMAIL',
          emailThreadId: threadId, emailMessageId: messageId,
          organizationId: org.id, customerId: customer.id,
        },
      });

      await fastify.prisma.message.create({
        data: { body: `Email from ${fromName} <${fromEmail}>:\n\nSubject: ${subject}`, senderType: 'CUSTOMER', ticketId: ticket.id },
      });

      console.log(`New ticket: ${subject}`);
    }
  } catch (err: any) {
    console.error(`Gmail error:`, err.message);
    throw err;
  }
}

export async function startGmailPoller(fastify: any) {}
