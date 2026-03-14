import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { loginSchema, registerSchema, schemasList } from './auth.schema.js';

interface RegisterBody {
  name: string;
  email: string;
  password: string;
  role?: string;
  inviteToken?: string;
  organizationName?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

const generateSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 7);
};

const authRoutes = async (fastify: FastifyInstance) => {
  schemasList.forEach((schema) => fastify.addSchema(schema));

  // REGISTER - POST /api/auth/register
  fastify.post<{ Body: RegisterBody }>('/register', {
    schema: registerSchema,
    handler: async (request, reply) => {
      try {
        const { name, email, password, role, inviteToken, organizationName } = request.body;

        const existing = await fastify.prisma.user.findUnique({ where: { email } });
        if (existing) {
          return reply.status(409).send({
            error: 'CONFLICT',
            message: `User with email ${email} already exists`,
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        let organizationId: string;

        if (inviteToken) {
          // Joining existing org via invite
          const invite = await fastify.prisma.invite.findUnique({ where: { token: inviteToken } });
          if (!invite) return reply.status(400).send({ message: 'Invalid invite token' });
          if (invite.usedAt) return reply.status(400).send({ message: 'Invite already used' });
          if (new Date() > invite.expiresAt) return reply.status(400).send({ message: 'Invite expired' });

          organizationId = invite.organizationId;

          await fastify.prisma.invite.update({
            where: { token: inviteToken },
            data: { usedAt: new Date() },
          });
        } else {
          // Creating new org
          const orgName = organizationName || `${name}'s Workspace`;
          const slug = generateSlug(orgName);
          const org = await fastify.prisma.organization.create({
            data: { name: orgName, slug },
          });
          organizationId = org.id;
        }

        const user = await fastify.prisma.user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            role: inviteToken ? (role || 'AGENT') : 'ADMIN',
            organizationId,
          },
        });

        const token = fastify.jwt.sign(
          { id: user.id, email: user.email, role: user.role, organizationId },
          { expiresIn: '7d' }
        );

        return reply.status(201).send({
          token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role, organizationId },
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
      }
    },
  });

  // LOGIN - POST /api/auth/login
  fastify.post<{ Body: LoginBody }>('/login', {
    schema: loginSchema,
    handler: async (request, reply) => {
      try {
        const { email, password } = request.body;

        const user = await fastify.prisma.user.findUnique({
          where: { email },
          include: { organization: true },
        });

        if (!user) {
          return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid email or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Invalid email or password' });
        }

        const token = fastify.jwt.sign(
          { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
          { expiresIn: '7d' }
        );

        return reply.send({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            organizationName: user.organization.name,
          },
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
      }
    },
  });
};

export default authRoutes;