import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { loginSchema, registerSchema, schemasList } from './auth.schema.js';

interface RegisterBody {
  name: string;
  email: string;
  password: string;
  role?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

const authRoutes = async (fastify: FastifyInstance) => {
  schemasList.forEach((schema) => fastify.addSchema(schema));

  // REGISTER - POST /api/auth/register
  fastify.post<{ Body: RegisterBody }>('/register', {
    schema: registerSchema,
    handler: async (request, reply) => {
      try {
        const { name, email, password, role } = request.body;

        const existing = await fastify.prisma.user.findUnique({
          where: { email },
        });

        if (existing) {
          return reply.status(409).send({
            error: 'CONFLICT',
            message: `User with email ${email} already exists`,
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await fastify.prisma.user.create({
          data: { name, email, password: hashedPassword, role: role || 'AGENT' },
        });

        const token = fastify.jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          { expiresIn: '7d' }
        );

        return reply.status(201).send({
          token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong',
        });
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
        });

        if (!user) {
          return reply.status(401).send({
            error: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
          return reply.status(401).send({
            error: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          });
        }

        const token = fastify.jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          { expiresIn: '7d' }
        );

        return reply.send({
          token,
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong',
        });
      }
    },
  });
};

export default authRoutes;