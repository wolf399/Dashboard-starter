import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export default async function adminRoutes(fastify: FastifyInstance) {
  // Get all users (admin endpoint for tracking signups)
  fastify.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
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

  // Get user count (quick check)
  fastify.get('/users/count', async (request: FastifyRequest, reply: FastifyReply) => {
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