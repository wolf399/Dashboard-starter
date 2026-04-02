import { FastifyInstance } from 'fastify';
import { google } from 'googleapis';

export default async function emailRoutes(fastify: FastifyInstance) {

  fastify.get('/test-smtp', async (request: any, reply: any) => {
    return { message: 'SMTP disabled, using Gmail API instead' };
  });

  fastify.post('/inbound', async (request: any, reply: any) => {
    try {
      const body = request.body as any;
      const fromEmail = body.envelope?.from || body.headers?.from || '';
      const fromName = fromEmail.split('@')[0] || fromEmail;
      const toEmail = body.envelope?.to || '';
      const subject = body.headers?.subject || 'No Subject';
      const text = body.plain || body.html || '';

      if (!fromEmail) return reply.status(200).send({ success: true });

      let org = null;
      const subMatch = toEmail.match(/\+([^@]+)@/);
      if (subMatch) {
        const slug = subMatch[1];
        org = await fastify.prisma.organization.findUnique({ where: { slug } });
      }
      if (!org) org = await fastify.prisma.organization.findFirst({ where: { inboundEmail: toEmail } });
      if (!org) org = await fastify.prisma.organization.findFirst();
      if (!org) return reply.status(200).send({ success: true });

      let customer = await fastify.prisma.customer.findFirst({
        where: { email: fromEmail, organizationId: org.id },
      });

      if (!customer) {
        customer = await fastify.prisma.customer.create({
          data: { name: fromName, email: fromEmail, status: 'ACTIVE', organizationId: org.id },
        });
      }

      const ticket = await fastify.prisma.ticket.create({
        data: {
          subject,
          description: text,
          status: 'OPEN',
          priority: 'MEDIUM',
          source: 'EMAIL',
          organizationId: org.id,
          customerId: customer.id,
        },
      });

      await fastify.prisma.message.create({
        data: { body: text, senderType: 'CUSTOMER', ticketId: ticket.id },
      });

      return reply.status(200).send({ success: true });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(200).send({ success: true });
    }
  });

  fastify.post('/send', async (request: any, reply: any) => {
    console.log('📧 /api/email/send called');
    try {
      const user = await request.jwtVerify() as any;
      const { to, subject, text, ticketId } = request.body as any;

      const org = await fastify.prisma.organization.findUnique({
        where: { id: user.organizationId },
      });

      if (!org?.gmailConnected || !org?.gmailAccessToken) {
        return reply.status(400).send({ error: 'Gmail not connected. Please connect your Gmail in Settings.' });
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://appealing-reflection-production-7fbc.up.railway.app/api/gmail/callback'
      );

      oauth2Client.setCredentials({
        access_token: org.gmailAccessToken,
        refresh_token: org.gmailRefreshToken,
      });

      // Auto-refresh if expired
      if (org.gmailTokenExpiry && new Date() > org.gmailTokenExpiry) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await fastify.prisma.organization.update({
          where: { id: org.id },
          data: {
            gmailAccessToken: credentials.access_token,
            gmailTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
          },
        });
        oauth2Client.setCredentials(credentials);
      }

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const emailLines = [
        `From: ${org.gmailEmail}`,
        `To: ${to}`,
        `Subject: Re: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        `<div style="font-family: sans-serif; max-width: 600px;">`,
        `<p>${text.replace(/\n/g, '<br/>')}</p>`,
        `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>`,
        `<p style="color:#9ca3af;font-size:12px;">Ticket ID: ${ticketId} — Replied via Agent CRM</p>`,
        `</div>`,
      ];

      const email = emailLines.join('\r\n');
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedEmail },
      });

      console.log(`📧 Email sent via Gmail API from ${org.gmailEmail} to ${to}`);
      return { success: true };
    } catch (err: any) {
      console.error('📧 Error:', err.message);
      return reply.status(500).send({ error: 'Failed to send email', detail: err.message });
    }
  });
}
