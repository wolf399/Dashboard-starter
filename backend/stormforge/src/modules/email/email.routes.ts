import { FastifyInstance } from 'fastify';
import nodemailer from 'nodemailer';

export default async function emailRoutes(fastify: FastifyInstance) {

  fastify.get('/test-smtp', async (request: any, reply: any) => {
    const net = await import('net');
    
    const test = (host: string, port: number) => new Promise((resolve) => {
      const socket = (net.default || net).createConnection({ host, port } as any);
      socket.setTimeout(5000);
      socket.on('connect', () => { socket.destroy(); resolve(`✅ ${host}:${port} OPEN`); });
      socket.on('error', (err: any) => resolve(`❌ ${host}:${port} BLOCKED - ${err.message}`));
      socket.on('timeout', () => { socket.destroy(); resolve(`❌ ${host}:${port} TIMEOUT`); });
    });

    const results = await Promise.all([
      test('smtp.gmail.com', 465),
      test('smtp.gmail.com', 587),
      test('smtp.gmail.com', 25),
    ]);

    return { results };
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

      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      const result = await resend.emails.send({
        from: 'Agent CRM <support@agent-crm.eu>',
        to,
        subject: `Re: ${subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <p>${text.replace(/\n/g, '<br/>')}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">Ticket ID: ${ticketId} — Replied via Agent CRM</p>
          </div>
        `,
        text,
      });

      console.log('📧 Email sent:', result);
      return { success: true };
    } catch (err: any) {
      console.error('📧 Error:', err.message);
      return reply.status(500).send({ error: 'Failed to send email', detail: err.message });
    }
  });

}
