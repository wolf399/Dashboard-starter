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

// How many days a deal can sit without a PATCH/activity before we nudge
// someone with an auto follow-up task. Tune as you learn your real sales
// cycle length.
const STALE_DEAL_DAYS = 5;

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
          activities:    { orderBy: { createdAt: 'desc' } },
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
      const { title, value, currency, stage, probability, expectedCloseDate, notes, contactId, customerId, assignedAgentId } = request.body;

      const deal = await fastify.prisma.deal.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!deal) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Deal not found' });

      // Verify any linked records actually belong to this org before linking them
      if (contactId) {
        const contact = await fastify.prisma.contact.findFirst({ where: { id: contactId, organizationId: user.organizationId } });
        if (!contact) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Invalid contactId' });
      }
      if (customerId) {
        const customer = await fastify.prisma.customer.findFirst({ where: { id: customerId, organizationId: user.organizationId } });
        if (!customer) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Invalid customerId' });
      }
      if (assignedAgentId) {
        const agent = await fastify.prisma.user.findFirst({ where: { id: assignedAgentId, organizationId: user.organizationId } });
        if (!agent) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Invalid assignedAgentId' });
      }

      const stageChanged = stage !== undefined && stage !== deal.stage;

      const updated = await fastify.prisma.deal.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(value !== undefined ? { value } : {}),
          ...(currency !== undefined ? { currency } : {}),
          ...(stage !== undefined ? { stage } : {}),
          ...(probability !== undefined ? { probability } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(expectedCloseDate !== undefined ? { expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null } : {}),
          ...(contactId !== undefined ? { contactId: contactId || null } : {}),
          ...(customerId !== undefined ? { customerId: customerId || null } : {}),
          ...(assignedAgentId !== undefined ? { assignedAgentId: assignedAgentId || null } : {}),
          lastActivityAt: new Date(),
        },
        include: {
          contact:       { select: { id: true, firstName: true, lastName: true } },
          customer:      { select: { id: true, name: true } },
          assignedAgent: { select: { id: true, name: true } },
        },
      });

      if (stageChanged) {
        await fastify.prisma.dealActivity.create({
          data: {
            dealId: id,
            type: 'STAGE_CHANGE',
            content: `Stage changed from ${deal.stage} to ${stage}`,
          },
        });
      }

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

  // ── Scheduled check — called by cron-job.org, same pattern as
  // gmail.routes.ts's /cron-sync. Finds deals that haven't moved in
  // STALE_DEAL_DAYS and drops an auto-generated follow-up task on the
  // assigned agent, so stalled deals surface themselves instead of quietly
  // rotting in a pipeline column. ──
  fastify.get('/cron-check-stale', async (request: any, reply: any) => {
    const authHeader = request.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const cutoff = new Date(Date.now() - STALE_DEAL_DAYS * 24 * 60 * 60 * 1000);

    const staleDeals = await fastify.prisma.deal.findMany({
      where: {
        stage: { notIn: ['WON', 'LOST'] },
        lastActivityAt: { lt: cutoff },
        assignedAgentId: { not: null },
      },
      include: {
        tasks: { where: { autoGenerated: true, status: { not: 'DONE' } } },
      },
    });

    let created = 0;

    for (const deal of staleDeals) {
      // Don't pile up duplicate nags — skip if an open auto-task already exists.
      if (deal.tasks.length > 0) continue;

      await fastify.prisma.task.create({
        data: {
          title: `Follow up: "${deal.title}" has gone quiet`,
          description: `No activity on this deal in ${STALE_DEAL_DAYS}+ days. Last touched ${deal.lastActivityAt.toISOString()}.`,
          priority: 'MEDIUM',
          dealId: deal.id,
          contactId: deal.contactId ?? undefined,
          assignedToId: deal.assignedAgentId!,
          createdById: deal.assignedAgentId!,
          autoGenerated: true,
          organizationId: deal.organizationId,
        },
      });
      created += 1;
    }

    return { success: true, checked: staleDeals.length, tasksCreated: created };
  });
};

export default dealRoutes;