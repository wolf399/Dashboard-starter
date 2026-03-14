import { FastifyInstance } from 'fastify';
import { schemasList, createTaskSchema, updateTaskSchema, deleteTaskSchema, getTaskSchema } from './task.schema.js';

interface CreateTaskBody {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  assignedToId?: string;
  ticketId?: string;
  createdById: string;
}

interface UpdateTaskBody {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  assignedToId?: string;
}

interface TaskParams { id: string; }

const taskRoutes = async (fastify: FastifyInstance) => {
  schemasList.forEach((schema) => fastify.addSchema(schema));

  fastify.get('/', {
    handler: async (request) => {
      const user = await request.jwtVerify() as any;
      const tasks = await fastify.prisma.task.findMany({
        where: { organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
        include: { assignedTo: true, createdBy: true, ticket: true },
      });
      return { tasks };
    },
  });

  fastify.get<{ Params: TaskParams }>('/:id', {
    schema: getTaskSchema,
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const task = await fastify.prisma.task.findFirst({
        where: { id, organizationId: user.organizationId },
        include: { assignedTo: true, createdBy: true, ticket: true },
      });
      if (!task) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Task not found' });
      return task;
    },
  });

  fastify.post<{ Body: CreateTaskBody }>('/', {
    schema: createTaskSchema,
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { title, description, dueDate, priority, assignedToId, ticketId, createdById } = request.body;
      const task = await fastify.prisma.task.create({
        data: {
          title,
          description,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          priority,
          assignedToId,
          ticketId,
          createdById,
          organizationId: user.organizationId,
        },
        include: { assignedTo: true, createdBy: true, ticket: true },
      });
      return reply.status(201).send(task);
    },
  });

  fastify.patch<{ Params: TaskParams; Body: UpdateTaskBody }>('/:id', {
    schema: updateTaskSchema,
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const { dueDate, ...rest } = request.body;
      const task = await fastify.prisma.task.findFirst({
        where: { id, organizationId: user.organizationId },
      });
      if (!task) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Task not found' });
      const updated = await fastify.prisma.task.update({
        where: { id },
        data: { ...rest, ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}) },
        include: { assignedTo: true, createdBy: true, ticket: true },
      });
      return updated;
    },
  });

  fastify.delete<{ Params: TaskParams }>('/:id', {
    schema: deleteTaskSchema,
    handler: async (request, reply) => {
      const user = await request.jwtVerify() as any;
      const { id } = request.params;
      const task = await fastify.prisma.task.findFirst({
        where: { id, organizationId: user.organizationId },
      });
      if (!task) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Task not found' });
      await fastify.prisma.task.delete({ where: { id } });
      return reply.status(204).send();
    },
  });
};

export default taskRoutes;