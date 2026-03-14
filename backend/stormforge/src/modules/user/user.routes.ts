import {
  createUserSchema, deleteUserSchema, getUserSchema,
  getUsersSchema, schemasList, updateUserSchema,
} from './user.schema.js';

import { FastifyInstance } from 'fastify';

interface UpdateUserBody {
  name?: string;
  email?: string;
}

interface UserParams { id: string; }

const userRoutes = async (fastify: FastifyInstance) => {
  schemasList.forEach((schema) => fastify.addSchema(schema));

  // GET all users in same org
  fastify.get('/', {
    schema: getUsersSchema,
    handler: async (request) => {
      const user = await request.jwtVerify() as any;
      const users = await fastify.prisma.user.findMany({
        where: { organizationId: user.organizationId },
        select: { id: true, email: true, name: true, role: true },
      });
      return { users };
    },
  });

  // GET single user
  fastify.get<{ Params: UserParams }>('/:id', {
    schema: getUserSchema,
    handler: async (request, reply) => {
      const { id } = request.params;
      const user = await fastify.prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true, role: true },
      });
      if (!user) return reply.status(404).send({ error: 'NOT_FOUND', message: 'User not found' });
      return user;
    },
  });

  // UPDATE profile
  fastify.patch<{ Params: UserParams; Body: UpdateUserBody }>('/:id', {
    schema: updateUserSchema,
    handler: async (request, reply) => {
      const { id } = request.params;
      const user = await fastify.prisma.user.findUnique({ where: { id } });
      if (!user) return reply.status(404).send({ error: 'NOT_FOUND', message: 'User not found' });
      const updated = await fastify.prisma.user.update({
        where: { id },
        data: request.body,
        select: { id: true, email: true, name: true, role: true },
      });
      return updated;
    },
  });

  // UPDATE password
  fastify.patch<{ Params: { id: string }; Body: { currentPassword: string; newPassword: string } }>(
    '/:id/password',
    {
      handler: async (request, reply) => {
        const { id } = request.params;
        const { currentPassword, newPassword } = request.body;
        const user = await fastify.prisma.user.findUnique({ where: { id } });
        if (!user) return reply.status(404).send({ message: 'User not found' });
        const bcrypt = await import('bcryptjs');
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return reply.status(400).send({ message: 'Current password is incorrect' });
        const hashed = await bcrypt.hash(newPassword, 10);
        await fastify.prisma.user.update({ where: { id }, data: { password: hashed } });
        return { message: 'Password updated successfully' };
      },
    }
  );

  // DELETE user
  fastify.delete<{ Params: UserParams }>('/:id', {
    schema: deleteUserSchema,
    handler: async (request, reply) => {
      const { id } = request.params;
      const user = await fastify.prisma.user.findUnique({ where: { id } });
      if (!user) return reply.status(404).send({ error: 'NOT_FOUND', message: 'User not found' });
      await fastify.prisma.user.delete({ where: { id } });
      return reply.status(204).send();
    },
  });
};

export default userRoutes;