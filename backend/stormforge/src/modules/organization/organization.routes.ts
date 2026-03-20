import { FastifyInstance } from 'fastify';

export default async function organizationRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    let org = await fastify.prisma.organization.findUnique({
      where: { id: user.organizationId },
    });
    if (!org) return reply.status(404).send({ message: 'Organization not found' });

    // Auto-generate inboundEmail if missing
    if (!org.inboundEmail) {
      org = await fastify.prisma.organization.update({
        where: { id: org.id },
        data: { inboundEmail: `552e0efa87304ddc1f27+${org.slug}@cloudmailin.net` },
      });
    }

    return org;
  });
}