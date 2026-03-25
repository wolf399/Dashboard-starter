import { FastifyInstance } from 'fastify';
import nodemailer from 'nodemailer';

export default async function emailRoutes(fastify: FastifyInstance) {

  // Inbound email webhook — CloudMailin
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

  // Send email reply using org's own Gmail SMTP
  fastify.post('/send', async (request: any, reply: any) => {
    try {
      const user = await request.jwtVerify() as any;
      const { to, subject, text, ticketId } = request.body as any;

      // Get org's IMAP/SMTP credentials
      const org = await fastify.prisma.organization.findUnique({
        where: { id: user.organizationId },
      });

      if (!org?.imapEmail || !org?.imapPassword) {
        return reply.status(400).send({ error: 'No email configured for this organization' });
      }

      // Use Gmail SMTP with same app password
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: org.imapEmail,
          pass: org.imapPassword,
        },
      });

      await transporter.sendMail({
        from: `Support <${org.imapEmail}>`,
        to,
        subject: `Re: ${subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <p>${text.replace(/\n/g, '<br/>')}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">
              Ticket ID: ${ticketId} — Replied via ShopsCRM
            </p>
          </div>
        `,
        text,
      });

      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to send email', detail: err.message });
    }
  });
}
