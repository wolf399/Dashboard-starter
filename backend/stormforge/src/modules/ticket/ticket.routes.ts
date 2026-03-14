import {
  createTicketSchema,
  deleteTicketSchema,
  getTicketSchema,
  getTicketsSchema,
  schemasList,
  updateTicketSchema,
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

interface TicketParams {
  id: string;
}

const ticketRoutes = async (fastify: FastifyInstance) => {
  schemasList.forEach((schema) => fastify.addSchema(schema));

  // CREATE - POST /api/tickets
  fastify.post<{ Body: CreateTicketBody }>('/', {
    schema: createTicketSchema,
    handler: async (request, reply) => {
      try {
        const { subject, description, customerId, priority, assignedAgentId } = request.body;

        const customer = await fastify.prisma.customer.findUnique({
          where: { id: customerId },
        });

        if (!customer) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: `Customer with id ${customerId} not found`,
          });
        }

        const ticket = await fastify.prisma.ticket.create({
          data: { subject, description, customerId, priority, assignedAgentId },
        });

        return reply.status(201).send(ticket);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong',
        });
      }
    },
  });

  // READ ALL - GET /api/tickets
  fastify.get('/', {
    schema: getTicketsSchema,
    handler: async () => {
      const tickets = await fastify.prisma.ticket.findMany({
        orderBy: { createdAt: 'desc' },
        include: { customer: true, assignedAgent: true },
      });
      return { tickets };
    },
  });

  // READ SINGLE - GET /api/tickets/:id
  fastify.get<{ Params: TicketParams }>('/:id', {
    schema: getTicketSchema,
    handler: async (request, reply) => {
      const { id } = request.params;
      const ticket = await fastify.prisma.ticket.findUnique({
        where: { id },
        include: { customer: true, assignedAgent: true },
      });

      if (!ticket) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `Ticket with id ${id} not found`,
        });
      }

      return ticket;
    },
  });

  // UPDATE - PATCH /api/tickets/:id
  fastify.patch<{ Params: TicketParams; Body: UpdateTicketBody }>('/:id', {
    schema: updateTicketSchema,
    handler: async (request, reply) => {
      const { id } = request.params;
      const data = request.body;

      const ticket = await fastify.prisma.ticket.findUnique({ where: { id } });

      if (!ticket) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `Ticket with id ${id} not found`,
        });
      }

      const updatedTicket = await fastify.prisma.ticket.update({
        where: { id },
        data,
      });

      return updatedTicket;
    },
  });

  // DELETE - DELETE /api/tickets/:id
  fastify.delete<{ Params: TicketParams }>('/:id', {
    schema: deleteTicketSchema,
    handler: async (request, reply) => {
      const { id } = request.params;

      const ticket = await fastify.prisma.ticket.findUnique({ where: { id } });

      if (!ticket) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `Ticket with id ${id} not found`,
        });
      }

      await fastify.prisma.ticket.delete({ where: { id } });

      return reply.status(204).send();
    },
  });
};

export default ticketRoutes;