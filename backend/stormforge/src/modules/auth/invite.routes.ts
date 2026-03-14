import { FastifyInstance } from 'fastify';
import crypto from 'crypto';

export default async function inviteRoutes(fastify: FastifyInstance) {
  // Generate invite link
  fastify.post('/generate', async (request: any, reply: any) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await fastify.prisma.invite.create({
      data: { token, expiresAt },
    });

    return { token, expiresAt };
  });

  // Validate invite token
  fastify.get('/validate/:token', async (request: any, reply: any) => {
    const { token } = request.params;
    const invite = await fastify.prisma.invite.findUnique({ where: { token } });

    if (!invite) return reply.status(404).send({ valid: false, message: 'Invalid invite link' });
    if (invite.usedAt) return reply.status(400).send({ valid: false, message: 'Invite already used' });
    if (new Date() > invite.expiresAt) return reply.status(400).send({ valid: false, message: 'Invite link expired' });

    return { valid: true };
  });

  // Mark invite as used
  fastify.patch('/use/:token', async (request: any, reply: any) => {
    const { token } = request.params;
    await fastify.prisma.invite.update({
      where: { token },
      data: { usedAt: new Date() },
    });
    return { success: true };
  });
}