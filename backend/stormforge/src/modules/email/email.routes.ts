import { FastifyInstance } from 'fastify';
import sgMail from '@sendgrid/mail';

export default async function emailRoutes(fastify: FastifyInstance) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

  // Inbound email webhook — CloudMailin calls this when an email arrives
  fastify.post('/inbound', async (request: any, reply: any) => {
    try {
      const body = request.body as any;

      const fromEmail = body.envelope?.from || body.headers?.from || '';
      const fromName = body.envelope?.from || fromEmail;
      const subject = body.headers?.subject || 'No Subject';
      const text = body.plain || body.html || '';

      if (!fromEmail) return reply.status(200).send({ success: true });

      // For now create in first organization — we'll scope this later
      const org = await fastify.prisma.organization.findFirst();
      if (!org) return reply.status(200).send({ success: true });

      // Find or create customer
      let customer = await fastify.prisma.customer.findFirst({
        where: { email: fromEmail, organizationId: org.id },
      });

      if (!customer) {
        customer = await fastify.prisma.customer.create({
          data: {
            name: fromName,
            email: fromEmail,
            status: 'ACTIVE',
            organizationId: org.id,
          },
        });
      }

      // Create ticket
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

      // Create first message
      await fastify.prisma.message.create({
        data: {
          body: text,
          senderType: 'CUSTOMER',
          ticketId: ticket.id,
        },
      });

      fastify.log.info(`New ticket created from email: ${subject}`);
      return reply.status(200).send({ success: true });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(200).send({ success: true }); // Always return 200 to CloudMailin
    }
  });

  // Send email to customer
  fastify.post('/send', async (request: any, reply: any) => {
    try {
      const { to, subject, text, ticketId } = request.body as {
        to: string; subject: string; text: string; ticketId: string;
      };

      await sgMail.send({
        to,
        from: 'support@shopscrm.io',
        subject: `Re: ${subject}`,
        text,
        html: `<p>${text.replace(/\n/g, '<br/>')}</p>
               <hr/>
               <p style="color:#9ca3af;font-size:12px">Ticket ID: ${ticketId}</p>`,
      });

      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to send email' });
    }
  });
}