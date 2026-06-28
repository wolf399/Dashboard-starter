import { FastifyInstance } from 'fastify';

interface CreateCannedResponseBody {
  title: string;
  body: string;
}

interface UpdateCannedResponseBody {
  title?: string;
  body?: string;
}

interface CannedResponseParams { id: string; }

const cannedResponseRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/canned-responses', {
    handler: async (request) => {
      const user = await request.jwtVerify() as any;
      const responses = await fastify.prisma.cannedResponse.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
      });
      return { cannedResponses: responses };
    },
  });

  fastify.post<{ Body: CreateCannedResponseBody }>('/canned-responses', {
    handler: async (request, reply) => {
      try {
        const user = await request.jwtVerify() as any;
        const { title, body } = request.body;

        if (!title || !body) {
          return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Title and body are required' });
        }

        const response = await fastify.prisma.cannedResponse.create({
          data: { title, body, organizationId: user.organizationId },
        });
        return reply.status(201).send(response);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
      }
    },
  });

  fastify.patch<{ Params: CannedResponseParams; Body: UpdateCannedResponseBody }>('/canned-responses/:id', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;

      const existing = await fastify.prisma.cannedResponse.findFirst({
        where: { id, organizationId: user.organizationId },
      });
      if (!existing) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Canned response not found' });

      const updated = await fastify.prisma.cannedResponse.update({
        where: { id },
        data: request.body,
      });
      return updated;
    },
  });

  fastify.delete<{ Params: CannedResponseParams }>('/canned-responses/:id', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;

      const existing = await fastify.prisma.cannedResponse.findFirst({
        where: { id, organizationId: user.organizationId },
      });
      if (!existing) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Canned response not found' });

      await fastify.prisma.cannedResponse.delete({ where: { id } });
      return reply.status(204).send();
    },
  });
};

export default cannedResponseRoutes;
