import Fastify from 'fastify';
import compress from '@fastify/compress';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import { prismaPlugin } from './plugins/prisma.js';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import userRoutes from './modules/user/user.routes.js';
import customerRoutes from './modules/customer/customer.routes.js';
import ticketRoutes from './modules/ticket/ticket.routes.js';
import messageRoutes from './modules/message/message.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import taskRoutes from './modules/task/task.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import emailRoutes from './modules/email/email.routes.js';
import inviteRoutes from './modules/auth/invite.routes.js';
import organizationRoutes from './modules/organization/organization.routes.js';
import imapRoutes from './modules/imap/imap.routes.js';
import gmailRoutes from './modules/gmail/gmail.routes.js';

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
const isTest =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST !== undefined ||
  process.env.TEST !== undefined;

dotenv.config();

export const build = async () => {
  const fastify = Fastify({
    logger: isTest
      ? false
      : {
          level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'info' : 'warn'),
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
          },
        },
    disableRequestLogging: process.env.NODE_ENV === 'production',
  });

  await fastify.register(sensible);
  await fastify.register(jwt, { secret: process.env.JWT_SECRET || 'fallback-secret' });
  await fastify.register(prismaPlugin);
  await fastify.register(compress, { global: true, encodings: ['gzip', 'deflate'], threshold: 1024 });
  await fastify.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  });
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });
  await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute', allowList: ['127.0.0.1'], skipOnError: false });
  await fastify.register(swagger, {
    openapi: {
      info: { title: 'Agent CRM API', version: '1.0.0', description: 'Agent CRM API' },
      components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
    },
  });
  await fastify.register(swaggerUi, { routePrefix: '/docs' });

  fastify.get('/health', async () => ({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() }));

  await fastify.register(authRoutes,         { prefix: '/api/auth' });
  await fastify.register(userRoutes,         { prefix: '/api/users' });
  await fastify.register(customerRoutes,     { prefix: '/api/customers' });
  await fastify.register(ticketRoutes,       { prefix: '/api/tickets' });
  await fastify.register(messageRoutes,      { prefix: '/api/messages' });
  await fastify.register(taskRoutes,         { prefix: '/api/tasks' });
  await fastify.register(aiRoutes,           { prefix: '/api/ai' });
  await fastify.register(emailRoutes,        { prefix: '/api/email' });
  await fastify.register(inviteRoutes,       { prefix: '/api/invites' });
  await fastify.register(organizationRoutes, { prefix: '/api/organization' });
  await fastify.register(imapRoutes,         { prefix: '/api/imap' });
  await fastify.register(gmailRoutes,        { prefix: '/api/gmail' });

  return fastify;
};

const setupGracefulShutdown = (fastify: Fastify.FastifyInstance) => {
  ['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.on(signal, async () => {
      try {
        await fastify.close();
        process.exit(0);
      } catch (err) {
        process.exit(1);
      }
    });
  });
};

const start = async () => {
  const fastify = await build();
  setupGracefulShutdown(fastify);
  try {
    const address = await fastify.listen({
      port: Number(process.env.PORT) || 3000,
      host: process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1',
    });
    console.log(`Server listening at ${address}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

if (isMain) start();
