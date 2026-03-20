import { FastifyInstance } from 'fastify';

export default async function emailRoutes(fastify: FastifyInstance) {

  // Inbound email webhook — CloudMailin calls this when an email arrives
  fastify.post('/inbound', async (request: any, reply: any) => {
    try {
      const body = request.body as any;

      const fromEmail = body.envelope?.from || body.headers?.from || '';
      const fromName = fromEmail.split('@')[0] || fromEmail;
      const toEmail = body.envelope?.to || '';
      const subject = body.headers?.subject || 'No Subject';
      const text = body.plain || body.html || '';

      if (!fromEmail) return reply.status(200).send({ success: true });

      // Extract org slug from subaddress e.g. support+my-org-slug@cloudmailin.net
      let org = null;
      const subMatch = toEmail.match(/\+([^@]+)@/);
      if (subMatch) {
        const slug = subMatch[1];
        org = await fastify.prisma.organization.findUnique({ where: { slug } });
      }

      // Fallback to inboundEmail match
      if (!org) {
        org = await fastify.prisma.organization.findFirst({
          where: { inboundEmail: toEmail },
        });
      }

      // Last fallback — first org
      if (!org) {
        org = await fastify.prisma.organization.findFirst();
      }

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

      fastify.log.info(`New ticket from email: ${subject} → org: ${org.name}`);
      return reply.status(200).send({ success: true });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(200).send({ success: true });
    }
  });

  // Send email reply to customer (placeholder — needs verified sender domain)
  fastify.post('/send', async (request: any, reply: any) => {
    try {
      const { to, subject, text, ticketId } = request.body as {
        to: string; subject: string; text: string; ticketId: string;
      };

      // TODO: wire up sending when domain is ready
      fastify.log.info(`Would send email to ${to}: ${subject}`);
      return { success: true };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({ error: 'Failed to send email' });
    }
  });
}