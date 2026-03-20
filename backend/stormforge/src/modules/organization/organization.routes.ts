import { FastifyInstance } from 'fastify';

export default async function organizationRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const org = await fastify.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!org) return reply.status(404).send({ message: 'Organization not found' });
    return org;
  });
}