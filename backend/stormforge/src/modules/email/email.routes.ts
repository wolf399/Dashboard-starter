import { FastifyInstance } from 'fastify';
import sgMail from '@sendgrid/mail';

export default async function emailRoutes(fastify: FastifyInstance) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

  // Inbound email webhook — SendGrid calls this when an email arrives
  fastify.post('/inbound', async (request: any, reply: any) => {
    try {
      const body = request.body as any;

      const fromEmail = body.from?.match(/<(.+)>/)?.[1] || body.from || '';
      const fromName  = body.from?.match(/^(.+?)\s*</)?.[1]?.trim() || fromEmail;
      const subject   = body.subject || 'No Subject';
      const text      = body.text || body.html || '';

      // Find or create customer by email
      let customer = await fastify.prisma.customer.findFirst({
        where: { email: fromEmail },
      });

      if (!customer) {
        customer = await fastify.prisma.customer.create({
          data: {
            name: fromName,
            email: fromEmail,
            status: 'ACTIVE',
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

      return reply.status(200).send({ success: true });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to process inbound email' });
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
        from: 'support@shopcrm.com', // Must be verified in SendGrid
        subject: `Re: ${subject}`,
        text,
        html: `<p>${text.replace(/\n/g, '<br/>')}</p>
               <hr/>
               <p style="color:#9ca3af;font-size:12px">Ticket ID: ${ticketId} — Reply to this email to continue the conversation.</p>`,
      });

      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to send email' });
    }
  });
}