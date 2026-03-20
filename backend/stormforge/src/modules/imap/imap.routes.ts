import { FastifyInstance } from 'fastify';

export default async function imapRoutes(fastify: FastifyInstance) {

  // Connect IMAP - test connection then save
  fastify.post('/connect', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const { email, password, host, port } = request.body as any;

    if (!email || !password) {
      return reply.status(400).send({ message: 'Email and password are required' });
    }

    // Test connection only - verify credentials work
    try {
      const { ImapFlow } = await import('imapflow');
      const client = new ImapFlow({
        host: host || 'imap.gmail.com',
        port: port || 993,
        secure: true,
        auth: { user: email, pass: password },
        logger: false,
      });
      await client.connect();
      await client.logout();
    } catch (err: any) {
      return reply.status(400).send({
        message: 'Could not connect to email. Check your credentials.',
        detail: err.message,
      });
    }

    // Save credentials
    const updated = await fastify.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        imapEmail: email,
        imapPassword: password,
        imapHost: host || 'imap.gmail.com',
        imapPort: port || 993,
        imapEnabled: true,
        lastImapSync: null,
      },
    });

    return { success: true, email: updated.imapEmail };
  });

  // Disconnect IMAP
  fastify.post('/disconnect', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    await fastify.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        imapEmail: null,
        imapPassword: null,
        imapEnabled: false,
      },
    });
    return { success: true };
  });

  // Get IMAP status
  fastify.get('/status', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const org = await fastify.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { imapEmail: true, imapEnabled: true, lastImapSync: true },
    });
    return org;
  });

  // Manual sync
  fastify.post('/sync', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const org = await fastify.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!org?.imapEnabled) {
      return reply.status(400).send({ message: 'IMAP not configured' });
    }
    const { checkImapForOrg } = await import('./imap.service.js');
    await checkImapForOrg(org);
    return { success: true };
  });

}
