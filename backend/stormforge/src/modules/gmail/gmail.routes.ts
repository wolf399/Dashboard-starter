import { FastifyInstance } from 'fastify';
import Groq from 'groq-sdk';

const REDIRECT_URI = 'https://agent-crm-backend.vercel.app/api/gmail/callback';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://agentcrm.company';

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Autonomous ticket-status transition: reads the customer's latest reply and
// decides, without a human in the loop, whether the issue is resolved. This
// is intentionally the first "execution layer" action we ship — a wrong
// resolve is cheap to undo (an agent just reopens the ticket), unlike a wrong
// auto-reply or auto-route, so it's a safe place to start mutating state
// directly instead of only drafting suggestions.
const checkIfResolved = async (latestMessage: string): Promise<boolean> => {
  try {
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 5,
      messages: [{
        role: 'user',
        content: `You are triaging a customer support reply. Respond with ONLY "YES" or "NO" — nothing else.

Does this message clearly indicate the customer's issue is now resolved and no further action is needed (e.g. they say thanks, confirm it's fixed, or say the problem is gone)? If it's ambiguous, asks a new question, or raises any further concern, answer NO.

Customer message:
"""
${latestMessage}
"""`,
      }],
    });
    const text = (response.choices[0]?.message?.content || '').trim().toUpperCase();
    return text.startsWith('YES');
  } catch (err: any) {
    // Fail safe: never block message ingestion on the AI call, and never
    // auto-resolve on an error — leave the ticket status untouched.
    console.error('Resolution check failed:', err.message);
    return false;
  }
};

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

const refreshAccessToken = async (refreshToken: string): Promise<any> => {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
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

// ── Extract HTML body from Gmail payload ──
const extractEmailBody = (payload: any): string => {
  if (!payload) return '';

  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    // 1. Try text/html first — preserves images, logos, formatting
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
    }
    // 2. Try nested multipart
    for (const part of payload.parts) {
      if (part.mimeType?.startsWith('multipart/') && part.parts) {
        const nested = extractEmailBody(part);
        if (nested) return nested;
      }
    }
    // 3. Fallback to text/plain
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
    }
  }

  return '';
};

// ── Replace CID inline image references with base64 data URIs ──
const extractEmailBodyWithCid = (payload: any): string => {
  const html = extractEmailBody(payload);
  if (!html) return '';

  const replaceCids = (parts: any[], current: string): string => {
    let result = current;
    for (const part of parts || []) {
      if (part.headers) {
        const cidHeader = part.headers.find((h: any) => h.name.toLowerCase() === 'content-id');
        if (cidHeader && part.body?.data) {
          const cid = cidHeader.value
            .replace(/[<>]/g, '')
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const base64 = part.body.data;
          const mime = part.mimeType;
          result = result.replace(
            new RegExp(`cid:${cid}`, 'gi'),
            `data:${mime};base64,${base64}`
          );
        }
      }
      if (part.parts) {
        result = replaceCids(part.parts, result);
      }
    }
    return result;
  };

  return replaceCids(payload?.parts || [], html);
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

    return reply.redirect(`${FRONTEND_URL}?gmailConnected=true`);
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

  // ── Manual sync — triggered from the frontend (e.g. a "Sync now" button) ──
  fastify.post('/sync', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const org = await fastify.prisma.organization.findUnique({ where: { id: user.organizationId } });
    if (!org?.gmailConnected || !org?.gmailAccessToken)
      return reply.status(400).send({ error: 'Gmail not connected' });
    await checkGmailForOrg(org, fastify);
    return { success: true };
  });

  // ── Scheduled sync — called by Vercel Cron (see vercel.json), not node-cron.
  // node-cron doesn't survive Vercel's serverless model (no persistent process
  // for setInterval-style timers to live in), so this is a real HTTP-triggered
  // cron hitting all connected orgs on a schedule instead. ──
  fastify.get('/cron-sync', async (request: any, reply: any) => {
    const authHeader = request.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const orgs = await fastify.prisma.organization.findMany({
      where: { gmailConnected: true, gmailAccessToken: { not: null } },
    });

    let synced = 0;
    for (const org of orgs) {
      try {
        await checkGmailForOrg(org, fastify);
        synced++;
      } catch (err: any) {
        fastify.log.error(`[Gmail Cron] Sync failed for ${org.gmailEmail}: ${err.message}`);
      }
    }

    return { synced, total: orgs.length };
  });
}

export async function checkGmailForOrg(org: any, fastify: any) {
  try {
    let accessToken = org.gmailAccessToken;

    // Helper function to make Gmail API calls with auto-refresh on 401
    const gmailFetchWithRefresh = async (path: string, options: any = {}): Promise<any> => {
      try {
        return await gmailFetch(accessToken, path, options);
      } catch (err: any) {
        // If we get a 401 (Unauthorized), try refreshing the token
        if (err.message.includes('401') && org.gmailRefreshToken) {
          console.log(`Token expired for ${org.gmailEmail}, attempting refresh...`);
          try {
            const newTokens = await refreshAccessToken(org.gmailRefreshToken);

            if (newTokens.access_token) {
              // Update the in-memory token for this function
              accessToken = newTokens.access_token;

              // Update the database with the new token
              const expiryDate = newTokens.expires_in
                ? new Date(Date.now() + newTokens.expires_in * 1000)
                : null;

              await fastify.prisma.organization.update({
                where: { id: org.id },
                data: {
                  gmailAccessToken: newTokens.access_token,
                  gmailTokenExpiry: expiryDate,
                },
              });

              console.log(`Token refreshed successfully for ${org.gmailEmail}`);

              // Retry the original request with the new token
              return await gmailFetch(accessToken, path, options);
            }
          } catch (refreshErr: any) {
            console.error(`Failed to refresh token for ${org.gmailEmail}:`, refreshErr.message);
            throw new Error(`Token refresh failed: ${refreshErr.message}`);
          }
        }
        throw err;
      }
    };

    // Use a real sync cursor instead of relying on Gmail's UNREAD label —
    // an email read directly in Gmail before we sync used to be skipped
    // forever. First sync ever for an org just looks back 24h.
    const afterDate = org.gmailLastSyncAt
      ? Math.floor(new Date(org.gmailLastSyncAt).getTime() / 1000)
      : Math.floor(Date.now() / 1000) - (24 * 60 * 60);

    const listData = await gmailFetchWithRefresh(
      `/messages?maxResults=20&q=in:inbox+after:${afterDate}`
    );
    const messages = (listData as any).messages || [];
    console.log(`Gmail: ${messages.length} new messages for ${org.gmailEmail}`);

    for (const msg of messages) {
      const full = await gmailFetchWithRefresh(
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

      // Skip our own sent messages (they show up in the same thread)
      if (!fromEmail || fromEmail.toLowerCase() === org.gmailEmail?.toLowerCase()) {
        continue;
      }

      const emailBody = extractEmailBodyWithCid((full as any).payload);
      const bodyText  = emailBody.trim() || `[No content — email from ${fromName} <${fromEmail}>]`;

      const existingTicket = await fastify.prisma.ticket.findFirst({
        where: { organizationId: org.id, emailThreadId: threadId },
      });

      if (existingTicket) {
        // Avoid inserting the same reply twice if a message falls on the
        // after:<timestamp> boundary between two sync runs.
        const alreadyStored = await fastify.prisma.message.findFirst({
          where: { ticketId: existingTicket.id, body: bodyText, senderType: 'CUSTOMER' },
        });
        if (alreadyStored) continue;

        await fastify.prisma.message.create({
          data: {
            body: bodyText,
            senderType: 'CUSTOMER',
            ticketId: existingTicket.id,
          },
        });
        console.log(`Reply added to ticket: ${existingTicket.id}`);

        if (existingTicket.status !== 'RESOLVED') {
          const resolved = await checkIfResolved(bodyText);
          if (resolved) {
            await fastify.prisma.ticket.update({
              where: { id: existingTicket.id },
              data: { status: 'RESOLVED' },
            });
            console.log(`Ticket auto-resolved based on customer signal: ${existingTicket.id}`);
          }
        }

        continue;
      }

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

    // Move the sync cursor forward only after a successful pass.
    await fastify.prisma.organization.update({
      where: { id: org.id },
      data: { gmailLastSyncAt: new Date() },
    });
  } catch (err: any) {
    console.error(`Gmail sync error:`, err.message);
    throw err;
  }
}