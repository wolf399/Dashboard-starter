import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function adminRoutes(fastify: FastifyInstance) {
  // Platform-admin check — this is YOU, not an org admin. Since there's no
  // platform-level role in the User model yet, gate this the same way as
  // the cron endpoint: a secret only you have, passed as a header.
  const requirePlatformAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    const secret = request.headers['x-admin-secret'];
    if (secret !== process.env.PLATFORM_ADMIN_SECRET) {
      return reply.status(401).send({ error: 'UNAUTHORIZED' });
    }
  };

  fastify.get('/users', { preHandler: requirePlatformAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const users = await fastify.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return reply.send({
        success: true,
        count: users.length,
        users,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch users',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  fastify.get('/users/count', { preHandler: requirePlatformAdmin }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const count = await fastify.prisma.user.count();
      return reply.send({
        success: true,
        totalUsers: count,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to count users',
      });
    }
  });
}