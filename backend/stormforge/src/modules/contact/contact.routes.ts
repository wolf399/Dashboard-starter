import { FastifyInstance } from 'fastify';

interface ContactParams { id: string; }

interface CreateContactBody {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
  status?: string;
  notes?: string;
  tags?: string;
}

interface UpdateContactBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
  status?: string;
  notes?: string;
  tags?: string;
}

interface CreateCallBody {
  outcome: string;
  duration?: number;
  notes?: string;
  createdAt?: string;
}

interface CreateNoteBody {
  content: string;
}

interface NoteParams { id: string; noteId: string; }

const contactRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', {
    handler: async (request) => {
      const user = await request.jwtVerify() as any;
      const { search, status } = request.query as { search?: string; status?: string };

      const where: any = { organizationId: user.organizationId };
      if (status && status !== 'ALL') where.status = status;
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName:  { contains: search, mode: 'insensitive' } },
          { email:     { contains: search, mode: 'insensitive' } },
          { company:   { contains: search, mode: 'insensitive' } },
        ];
      }

      const contacts = await fastify.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { deals: { select: { id: true, title: true, stage: true, value: true } } },
      });
      return { contacts };
    },
  });

  fastify.post<{ Body: CreateContactBody }>('/', {
    handler: async (request, reply) => {
      try {
        const user = await request.jwtVerify() as any;
        const { firstName, lastName, email, phone, company, jobTitle, source, status, notes, tags } = request.body;
        if (!firstName?.trim() || !lastName?.trim()) {
          return reply.status(400).send({ error: 'BAD_REQUEST', message: 'First name and last name are required' });
        }
        const contact = await fastify.prisma.contact.create({
          data: { firstName, lastName, email, phone, company, jobTitle, source, status, notes, tags, organizationId: user.organizationId },
        });
        return reply.status(201).send(contact);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
      }
    },
  });

  fastify.get<{ Params: ContactParams }>('/:id', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const contact = await fastify.prisma.contact.findFirst({
        where: { id, organizationId: user.organizationId },
        include: { deals: true },
      });
      if (!contact) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Contact not found' });
      return contact;
    },
  });

  fastify.patch<{ Params: ContactParams; Body: UpdateContactBody }>('/:id', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const contact = await fastify.prisma.contact.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!contact) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Contact not found' });
      const updated = await fastify.prisma.contact.update({ where: { id }, data: request.body });
      return updated;
    },
  });

  fastify.delete<{ Params: ContactParams }>('/:id', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const contact = await fastify.prisma.contact.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!contact) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Contact not found' });
      await fastify.prisma.contact.delete({ where: { id } });
      return reply.status(204).send();
    },
  });

  fastify.post<{ Params: ContactParams }>('/:id/convert', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const contact = await fastify.prisma.contact.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!contact) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Contact not found' });
      if (contact.status === 'CONVERTED') {
        return reply.status(409).send({ error: 'CONFLICT', message: 'Contact is already converted' });
      }
      const customer = await fastify.prisma.customer.create({
        data: {
          name: `${contact.firstName} ${contact.lastName}`,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          tags: contact.tags,
          organizationId: user.organizationId,
        },
      });
      await fastify.prisma.contact.update({ where: { id }, data: { status: 'CONVERTED' } });
      return reply.status(201).send({ customer });
    },
  });

  // ── Timeline ──────────────────────────────────────────────────
  fastify.get<{ Params: ContactParams }>('/:id/timeline', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const contact = await fastify.prisma.contact.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!contact) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Contact not found' });

      const [notes, calls, deals, tasks] = await Promise.all([
        fastify.prisma.contactNote.findMany({ where: { contactId: id }, include: { agent: true } }),
        fastify.prisma.callLog.findMany({ where: { contactId: id }, include: { agent: true } }),
        fastify.prisma.deal.findMany({ where: { contactId: id } }),
        fastify.prisma.task.findMany({ where: { contactId: id }, include: { createdBy: true, assignedTo: true } }),
      ]);

      let tickets: any[] = [];
      if (contact.email) {
        const customer = await fastify.prisma.customer.findFirst({
          where: { organizationId: user.organizationId, email: contact.email },
        });
        if (customer) {
          tickets = await fastify.prisma.ticket.findMany({
            where: { customerId: customer.id },
            include: { messages: true, assignedAgent: true },
            orderBy: { createdAt: 'desc' },
          });
        }
      }

      const items: any[] = [];

      notes.forEach((n) => items.push({
        id: `note-${n.id}`, type: 'note', title: 'Note added',
        description: n.content, agentName: n.agent?.name || null, createdAt: n.createdAt,
      }));

      calls.forEach((c) => items.push({
        id: `call-${c.id}`, type: 'call', title: `Call logged — ${c.outcome}`,
        description: c.notes || '', agentName: c.agent?.name || null, createdAt: c.createdAt,
      }));

      deals.forEach((d) => items.push({
        id: `deal-${d.id}`, type: 'deal', title: `Deal created: ${d.title}`,
        description: `Stage: ${d.stage}${d.value != null ? ` · $${d.value.toLocaleString()}` : ''}`,
        agentName: null, createdAt: d.createdAt,
      }));

      tasks.forEach((t) => items.push({
        id: `task-${t.id}`, type: 'task', title: `Task created: ${t.title}`,
        description: t.description || '', agentName: t.createdBy?.name || null, createdAt: t.createdAt,
      }));

      tickets.forEach((tk) => {
        items.push({
          id: `ticket-${tk.id}`, type: 'ticket', title: `Ticket created: ${tk.subject}`,
          description: tk.description, agentName: tk.assignedAgent?.name || null, createdAt: tk.createdAt,
        });
        tk.messages.forEach((m: any) => {
          items.push({
            id: `email-${m.id}`,
            type: 'email',
            title: m.senderType === 'AGENT' ? 'Email sent' : 'Email received',
            description: m.body,
            agentName: tk.assignedAgent?.name || null,
            createdAt: m.createdAt,
          });
        });
      });

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return { timeline: items, tickets };
    },
  });

  // ── Calls ─────────────────────────────────────────────────────
  fastify.get<{ Params: ContactParams }>('/:id/calls', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const contact = await fastify.prisma.contact.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!contact) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Contact not found' });

      const calls = await fastify.prisma.callLog.findMany({
        where: { contactId: id },
        orderBy: { createdAt: 'desc' },
        include: { agent: { select: { id: true, name: true } } },
      });
      return { calls };
    },
  });

  fastify.post<{ Params: ContactParams; Body: CreateCallBody }>('/:id/calls', {
    handler: async (request, reply) => {
      try {
        const user = await request.jwtVerify() as any;
        const { id } = request.params;
        const { outcome, duration, notes, createdAt } = request.body;
        if (!outcome?.trim()) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Outcome is required' });

        const contact = await fastify.prisma.contact.findFirst({ where: { id, organizationId: user.organizationId } });
        if (!contact) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Contact not found' });

        const call = await fastify.prisma.callLog.create({
          data: {
            outcome,
            duration: duration ?? undefined,
            notes,
            createdAt: createdAt ? new Date(createdAt) : undefined,
            contactId: id,
            organizationId: user.organizationId,
            agentId: user.id,
          },
          include: { agent: { select: { id: true, name: true } } },
        });
        return reply.status(201).send(call);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
      }
    },
  });

  // ── Notes ─────────────────────────────────────────────────────
  fastify.get<{ Params: ContactParams }>('/:id/notes', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const contact = await fastify.prisma.contact.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!contact) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Contact not found' });

      const notes = await fastify.prisma.contactNote.findMany({
        where: { contactId: id },
        orderBy: { createdAt: 'desc' },
        include: { agent: { select: { id: true, name: true } } },
      });
      return { notes };
    },
  });

  fastify.post<{ Params: ContactParams; Body: CreateNoteBody }>('/:id/notes', {
    handler: async (request, reply) => {
      try {
        const user = await request.jwtVerify() as any;
        const { id } = request.params;
        const { content } = request.body;
        if (!content?.trim()) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Content is required' });

        const contact = await fastify.prisma.contact.findFirst({ where: { id, organizationId: user.organizationId } });
        if (!contact) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Contact not found' });

        const note = await fastify.prisma.contactNote.create({
          data: { content, contactId: id, organizationId: user.organizationId, agentId: user.id },
          include: { agent: { select: { id: true, name: true } } },
        });
        return reply.status(201).send(note);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
      }
    },
  });

  fastify.delete<{ Params: NoteParams }>('/:id/notes/:noteId', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id, noteId } = request.params;
      const note = await fastify.prisma.contactNote.findFirst({
        where: { id: noteId, contactId: id, organizationId: user.organizationId },
      });
      if (!note) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Note not found' });
      await fastify.prisma.contactNote.delete({ where: { id: noteId } });
      return reply.status(204).send();
    },
  });
};

export default contactRoutes;
