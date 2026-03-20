import { FastifyInstance } from 'fastify';
import { checkImapForOrg } from './imap.service.js';

export default async function imapRoutes(fastify: FastifyInstance) {
  // Save IMAP credentials
  fastify.post('/connect', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const { email, password, host, port } = request.body as any;

    if (!email || !password) {
      return reply.status(400).send({ message: 'Email and password are required' });
    }

    // Test the connection first
    try {
      const org = {
        id: user.organizationId,
        name: 'test',
        imapEmail: email,
        imapPassword: password,
        imapHost: host || 'imap.gmail.com',
        imapPort: port || 993,
        lastImapSync: null,
      };
      await checkImapForOrg(org);
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
        lastImapSync: new Date(),
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

  // Manual sync trigger
  fastify.post('/sync', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const org = await fastify.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!org?.imapEnabled) {
      return reply.status(400).send({ message: 'IMAP not configured' });
    }
    await checkImapForOrg(org);
    return { success: true };
  });
}