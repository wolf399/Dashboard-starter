import {
  createCustomerSchema, deleteCustomerSchema, getCustomerSchema,
  getCustomersSchema, schemasList, updateCustomerSchema,
} from './customer.schema.js';
import { FastifyInstance } from 'fastify';

interface CreateCustomerBody {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string;
}

interface UpdateCustomerBody {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  tags?: string;
}

interface CustomerParams { id: string; }
interface NoteParams { id: string; noteId: string; }
interface NoteBody { content: string; }

const customerRoutes = async (fastify: FastifyInstance) => {
  schemasList.forEach((schema) => fastify.addSchema(schema));

  fastify.post<{ Body: CreateCustomerBody }>('/', {
    schema: createCustomerSchema,
    handler: async (request, reply) => {
      try {
        const user = await request.jwtVerify() as any;
        const { organizationId } = user;
        const { name, email, phone, company, tags } = request.body;

        if (email) {
          const existing = await fastify.prisma.customer.findFirst({
            where: { email, organizationId },
          });
          if (existing) return reply.status(409).send({ error: 'CONFLICT', message: `Customer with email ${email} already exists` });
        }

        const customer = await fastify.prisma.customer.create({
          data: { name, email, phone, company, tags, organizationId },
        });
        return reply.status(201).send(customer);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
      }
    },
  });

  fastify.get('/', {
    schema: getCustomersSchema,
    handler: async (request) => {
      const user = await request.jwtVerify() as any;
      const customers = await fastify.prisma.customer.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
      });
      return { customers };
    },
  });

  fastify.get<{ Params: CustomerParams }>('/:id', {
    schema: getCustomerSchema,
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const customer = await fastify.prisma.customer.findFirst({
        where: { id, organizationId: user.organizationId },
      });
      if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Customer not found' });
      return customer;
    },
  });

  fastify.patch<{ Params: CustomerParams; Body: UpdateCustomerBody }>('/:id', {
    schema: updateCustomerSchema,
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const customer = await fastify.prisma.customer.findFirst({
        where: { id, organizationId: user.organizationId },
      });
      if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Customer not found' });
      const updated = await fastify.prisma.customer.update({
        where: { id },
        data: { ...request.body, lastActivity: new Date() },
      });
      return updated;
    },
  });

  fastify.delete<{ Params: CustomerParams }>('/:id', {
    schema: deleteCustomerSchema,
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const customer = await fastify.prisma.customer.findFirst({
        where: { id, organizationId: user.organizationId },
      });
      if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Customer not found' });
      await fastify.prisma.customer.delete({ where: { id } });
      return reply.status(204).send();
    },
  });
  fastify.get<{ Params: CustomerParams }>('/:id/notes', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const customer = await fastify.prisma.customer.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Customer not found' });
      const notes = await fastify.prisma.note.findMany({
        where: { customerId: id, organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
      });
      return { notes };
    },
  });

  fastify.post<{ Params: CustomerParams; Body: NoteBody }>('/:id/notes', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const { content } = request.body;
      if (!content?.trim()) return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Content is required' });
      const customer = await fastify.prisma.customer.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Customer not found' });
      const note = await fastify.prisma.note.create({
        data: { content: content.trim(), customerId: id, organizationId: user.organizationId },
      });
      return reply.status(201).send(note);
    },
  });

  fastify.delete<{ Params: NoteParams }>('/:id/notes/:noteId', {
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id, noteId } = request.params;
      const note = await fastify.prisma.note.findFirst({
        where: { id: noteId, customerId: id, organizationId: user.organizationId },
      });
      if (!note) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Note not found' });
      await fastify.prisma.note.delete({ where: { id: noteId } });
      return reply.status(204).send();
    },
  });
};

export default customerRoutes;