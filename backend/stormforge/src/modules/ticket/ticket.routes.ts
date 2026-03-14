import {
  createTicketSchema, deleteTicketSchema, getTicketSchema,
  getTicketsSchema, schemasList, updateTicketSchema,
} from './ticket.schema.js';
import { FastifyInstance } from 'fastify';

interface CreateTicketBody {
  subject: string;
  description: string;
  customerId: string;
  priority?: string;
  assignedAgentId?: string;
}

interface UpdateTicketBody {
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedAgentId?: string;
}

interface TicketParams { id: string; }

const ticketRoutes = async (fastify: FastifyInstance) => {
  schemasList.forEach((schema) => fastify.addSchema(schema));

  fastify.post<{ Body: CreateTicketBody }>('/', {
    schema: createTicketSchema,
    handler: async (request, reply) => {
      try {
        const user = await request.jwtVerify() as any;
        const { organizationId } = user;
        const { subject, description, customerId, priority, assignedAgentId } = request.body;

        const customer = await fastify.prisma.customer.findFirst({
          where: { id: customerId, organizationId },
        });
        if (!customer) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Customer not found' });

        const ticket = await fastify.prisma.ticket.create({
          data: { subject, description, customerId, priority, assignedAgentId, organizationId },
          include: { customer: true, assignedAgent: true },
        });

        return reply.status(201).send(ticket);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
      }
    },
  });

  fastify.get('/', {
    schema: getTicketsSchema,
    handler: async (request) => {
      const user = await request.jwtVerify() as any;
      const tickets = await fastify.prisma.ticket.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        include: { customer: true, assignedAgent: true },
      });
      return { tickets };
    },
  });

  fastify.get<{ Params: TicketParams }>('/:id', {
    schema: getTicketSchema,
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const ticket = await fastify.prisma.ticket.findFirst({
        where: { id, organizationId: user.organizationId },
        include: { customer: true, assignedAgent: true },
      });
      if (!ticket) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Ticket not found' });
      return ticket;
    },
  });

  fastify.patch<{ Params: TicketParams; Body: UpdateTicketBody }>('/:id', {
    schema: updateTicketSchema,
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const ticket = await fastify.prisma.ticket.findFirst({
        where: { id, organizationId: user.organizationId },
      });
      if (!ticket) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Ticket not found' });
      const updated = await fastify.prisma.ticket.update({
        where: { id },
        data: request.body,
        include: { customer: true, assignedAgent: true },
      });
      return updated;
    },
  });

  fastify.delete<{ Params: TicketParams }>('/:id', {
    schema: deleteTicketSchema,
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const ticket = await fastify.prisma.ticket.findFirst({
        where: { id, organizationId: user.organizationId },
      });
      if (!ticket) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Ticket not found' });
      await fastify.prisma.ticket.delete({ where: { id } });
      return reply.status(204).send();
    },
  });
};

export default ticketRoutes;