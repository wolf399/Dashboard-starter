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
};

export default contactRoutes;
