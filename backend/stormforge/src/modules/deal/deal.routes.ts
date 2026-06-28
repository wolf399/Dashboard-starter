import { FastifyInstance } from 'fastify';

interface DealParams { id: string; }

interface CreateDealBody {
  title: string;
  value?: number;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
  notes?: string;
  contactId?: string;
  customerId?: string;
  assignedAgentId?: string;
}

interface UpdateDealBody {
  title?: string;
  value?: number;
  currency?: string;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
  notes?: string;
  contactId?: string;
  customerId?: string;
  assignedAgentId?: string;
}

const dealRoutes = async (fastify: FastifyInstance) => {
  // Stats must be registered before /:id
  fastify.get('/stats', {
    handler: async (request) => {
      const user = await request.jwtVerify() as any;
      const { organizationId } = user;

      const all = await fastify.prisma.deal.findMany({ where: { organizationId } });
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalPipeline = all.filter((d) => d.stage !== 'LOST').reduce((s, d) => s + (d.value ?? 0), 0);
      const dealsThisMonth = all.filter((d) => new Date(d.createdAt) >= startOfMonth).length;
      const won  = all.filter((d) => d.stage === 'WON').length;
      const lost = all.filter((d) => d.stage === 'LOST').length;
      const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;
      const avgDealValue = all.length > 0 ? Math.round(all.reduce((s, d) => s + (d.value ?? 0), 0) / all.length) : 0;

      return { totalPipeline, dealsThisMonth, winRate, avgDealValue };
    },
  });

  fastify.get('/', {
    handler: async (request) => {
      const user = await request.jwtVerify() as any;
      const deals = await fastify.prisma.deal.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        include: {
          contact:       { select: { id: true, firstName: true, lastName: true } },
          customer:      { select: { id: true, name: true } },
          assignedAgent: { select: { id: true, name: true } },
        },
      });
      return { deals };
    },
  });

  fastify.post<{ Body: CreateDealBody }>('/', {
    handler: async (request, reply) => {
      try {
        const user = await request.jwtVerify() as any;
        const { title, value, currency, stage, probability, expectedCloseDate, notes, contactId, customerId, assignedAgentId } = request.body;
        if (!title?.trim()) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Title is required' });

        const deal = await fastify.prisma.deal.create({
          data: {
            title, value, currency, stage, probability,
            expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
            notes,
            contactId:      contactId      || undefined,
            customerId:     customerId     || undefined,
            assignedAgentId: assignedAgentId || undefined,
            organizationId: user.organizationId,
          },
          include: {
            contact:       { select: { id: true, firstName: true, lastName: true } },
            customer:      { select: { id: true, name: true } },
            assignedAgent: { select: { id: true, name: true } },
          },
        });
        return reply.status(201).send(deal);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
      }
    },
  });

  fastify.get<{ Params: DealParams }>('/:id', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const deal = await fastify.prisma.deal.findFirst({
        where: { id, organizationId: user.organizationId },
        include: {
          contact:       true,
          customer:      true,
          assignedAgent: { select: { id: true, name: true } },
        },
      });
      if (!deal) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Deal not found' });
      return deal;
    },
  });

  fastify.patch<{ Params: DealParams; Body: UpdateDealBody }>('/:id', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const { expectedCloseDate, contactId, customerId, assignedAgentId, ...rest } = request.body;

      const deal = await fastify.prisma.deal.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!deal) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Deal not found' });

      const updated = await fastify.prisma.deal.update({
        where: { id },
        data: {
          ...rest,
          ...(expectedCloseDate !== undefined ? { expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null } : {}),
          ...(contactId      !== undefined ? { contactId:      contactId      || null } : {}),
          ...(customerId     !== undefined ? { customerId:     customerId     || null } : {}),
          ...(assignedAgentId !== undefined ? { assignedAgentId: assignedAgentId || null } : {}),
        },
        include: {
          contact:       { select: { id: true, firstName: true, lastName: true } },
          customer:      { select: { id: true, name: true } },
          assignedAgent: { select: { id: true, name: true } },
        },
      });
      return updated;
    },
  });

  fastify.delete<{ Params: DealParams }>('/:id', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const deal = await fastify.prisma.deal.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!deal) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Deal not found' });
      await fastify.prisma.deal.delete({ where: { id } });
      return reply.status(204).send();
    },
  });
};

export default dealRoutes;
