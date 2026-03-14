import {
  createMessageSchema,
  deleteMessageSchema,
  getMessageSchema,
  getMessagesByTicketSchema,
  schemasList,
} from './message.schema.js';

import { FastifyInstance } from 'fastify';

interface CreateMessageBody {
  body: string;
  senderType: string;
  ticketId: string;
}

interface MessageParams {
  id: string;
}

interface TicketMessagesParams {
  ticketId: string;
}

const messageRoutes = async (fastify: FastifyInstance) => {
  schemasList.forEach((schema) => fastify.addSchema(schema));

  // CREATE - POST /api/messages
  fastify.post<{ Body: CreateMessageBody }>('/', {
    schema: createMessageSchema,
    handler: async (request, reply) => {
      try {
        const { body, senderType, ticketId } = request.body;

        const ticket = await fastify.prisma.ticket.findUnique({
          where: { id: ticketId },
        });

        if (!ticket) {
          return reply.status(404).send({
            error: 'NOT_FOUND',
            message: `Ticket with id ${ticketId} not found`,
          });
        }

        const message = await fastify.prisma.message.create({
          data: { body, senderType, ticketId },
        });

        // Update ticket's updatedAt when a new message arrives
        await fastify.prisma.ticket.update({
          where: { id: ticketId },
          data: { updatedAt: new Date() },
        });

        return reply.status(201).send(message);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong',
        });
      }
    },
  });

  // GET ALL MESSAGES FOR A TICKET - GET /api/messages/ticket/:ticketId
  fastify.get<{ Params: TicketMessagesParams }>('/ticket/:ticketId', {
    schema: getMessagesByTicketSchema,
    handler: async (request, reply) => {
      const { ticketId } = request.params;

      const ticket = await fastify.prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `Ticket with id ${ticketId} not found`,
        });
      }

      const messages = await fastify.prisma.message.findMany({
        where: { ticketId },
        orderBy: { createdAt: 'asc' },
      });

      return { messages };
    },
  });

  // GET SINGLE MESSAGE - GET /api/messages/:id
  fastify.get<{ Params: MessageParams }>('/:id', {
    schema: getMessageSchema,
    handler: async (request, reply) => {
      const { id } = request.params;
      const message = await fastify.prisma.message.findUnique({
        where: { id },
      });

      if (!message) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `Message with id ${id} not found`,
        });
      }

      return message;
    },
  });

  // DELETE - DELETE /api/messages/:id
  fastify.delete<{ Params: MessageParams }>('/:id', {
    schema: deleteMessageSchema,
    handler: async (request, reply) => {
      const { id } = request.params;

      const message = await fastify.prisma.message.findUnique({ where: { id } });

      if (!message) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `Message with id ${id} not found`,
        });
      }

      await fastify.prisma.message.delete({ where: { id } });

      return reply.status(204).send();
    },
  });
};

export default messageRoutes;