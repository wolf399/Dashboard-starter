import { FastifyInstance } from 'fastify';

const REDIRECT_URI = 'https://agent-crm-backend.vercel.app/api/gmail/callback';
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
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
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
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
  return res.json();
};

// ── Extract plain text body from Gmail payload ──
const extractEmailBody = (payload: any): string => {
  if (!payload) return '';

  // Direct body data (simple emails)
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  // Multipart — look for text/plain first, then text/html
  if (payload.parts && Array.isArray(payload.parts)) {
    // 1. Try text/plain
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
    }
    // 2. Try nested multipart (e.g. multipart/alternative inside multipart/mixed)
    for (const part of payload.parts) {
      if (part.mimeType?.startsWith('multipart/') && part.parts) {
        const nested = extractEmailBody(part);
        if (nested) return nested;
      }
    }
    // 3. Fallback to text/html, strip tags
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        const html = Buffer.from(part.body.data, 'base64url').toString('utf-8');
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }
  }

  return '';
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
    const userInfo = await getUserEmail((tokens as any).access_token);

    await fastify.prisma.organization.update({
      where: { id: organizationId },
      data: {
        gmailAccessToken: (tokens as any).access_token,
        gmailRefreshToken: (tokens as any).refresh_token,
        gmailTokenExpiry: (tokens as any).expires_in
          ? new Date(Date.now() + (tokens as any).expires_in * 1000)
          : null,
        gmailEmail: (userInfo as any).email,
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

  fastify.post('/sync', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const org = await fastify.prisma.organization.findUnique({ where: { id: user.organizationId } });
    if (!org?.gmailConnected || !org?.gmailAccessToken)
      return reply.status(400).send({ error: 'Gmail not connected' });
    await checkGmailForOrg(org, fastify);
    return { success: true };
  });
}

export async function checkGmailForOrg(org: any, fastify: any) {
  try {
    const afterDate = org.gmailTokenExpiry
      ? Math.floor(new Date(org.gmailTokenExpiry).getTime() / 1000) - (90 * 24 * 60 * 60)
      : Math.floor(Date.now() / 1000) - (24 * 60 * 60);

    const listData = await gmailFetch(
      org.gmailAccessToken,
      `/messages?maxResults=10&q=is:unread+in:inbox+after:${afterDate}`
    );
    const messages = (listData as any).messages || [];
    console.log(`Gmail: ${messages.length} unread for ${org.gmailEmail}`);

    for (const msg of messages) {
      // ── Use format=full to get the actual email body ──
      const full = await gmailFetch(
        org.gmailAccessToken,
        `/messages/${msg.id}?format=full`
      );

      const headers = (full as any).payload?.headers || [];
      const from      = headers.find((h: any) => h.name === 'From')?.value || '';
      const subject   = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
      const messageId = headers.find((h: any) => h.name === 'Message-ID')?.value || '';
      const threadId  = (full as any).threadId || '';

      const emailMatch = from.match(/<(.+)>/) || [null, from];
      const fromEmail  = (emailMatch[1] || from).trim();
      const fromName   = from.replace(/<.+>/, '').trim() || fromEmail;

      // Skip our own emails
      if (!fromEmail || fromEmail.toLowerCase() === org.gmailEmail?.toLowerCase()) {
        await gmailFetch(org.gmailAccessToken, `/messages/${msg.id}/modify`, {
          method: 'POST',
          body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
        });
        continue;
      }

      // Mark as read
      await gmailFetch(org.gmailAccessToken, `/messages/${msg.id}/modify`, {
        method: 'POST',
        body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
      });

      // ── Extract the real email body ──
      const emailBody = extractEmailBody((full as any).payload);
      const bodyText  = emailBody.trim() || `[No content — email from ${fromName} <${fromEmail}>]`;

      // ── Existing thread → add reply message ──
      const existingTicket = await fastify.prisma.ticket.findFirst({
        where: { organizationId: org.id, emailThreadId: threadId },
      });

      if (existingTicket) {
        await fastify.prisma.message.create({
          data: {
            body: bodyText,
            senderType: 'CUSTOMER',
            ticketId: existingTicket.id,
          },
        });
        console.log(`Reply added to ticket: ${existingTicket.id}`);
        continue;
      }

      // ── New email → create customer + ticket + first message ──
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
        data: {
          body: bodyText,
          senderType: 'CUSTOMER',
          ticketId: ticket.id,
        },
      });

      console.log(`New ticket created: ${subject}`);
    }
  } catch (err: any) {
    console.error(`Gmail sync error:`, err.message);
    throw err;
  }
}

export async function startGmailPoller(fastify: any) {}