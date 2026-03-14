import {
  createCustomerSchema,
  deleteCustomerSchema,
  getCustomerSchema,
  getCustomersSchema,
  schemasList,
  updateCustomerSchema,
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

interface CustomerParams {
  id: string;
}

const customerRoutes = async (fastify: FastifyInstance) => {
  schemasList.forEach((schema) => fastify.addSchema(schema));

  // CREATE - POST /api/customers
  fastify.post<{ Body: CreateCustomerBody }>('/', {
    schema: createCustomerSchema,
    handler: async (request, reply) => {
      try {
        const { name, email, phone, company, tags } = request.body;

        if (email) {
          const existing = await fastify.prisma.customer.findFirst({
            where: { email },
          });
          if (existing) {
            return reply.status(409).send({
              error: 'CONFLICT',
              message: `Customer with email ${email} already exists`,
            });
          }
        }

        const customer = await fastify.prisma.customer.create({
          data: { name, email, phone, company, tags },
        });

        return reply.status(201).send(customer);
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong',
        });
      }
    },
  });

  // READ ALL - GET /api/customers
  fastify.get('/', {
    schema: getCustomersSchema,
    handler: async () => {
      const customers = await fastify.prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return { customers };
    },
  });

  // READ SINGLE - GET /api/customers/:id
  fastify.get<{ Params: CustomerParams }>('/:id', {
    schema: getCustomerSchema,
    handler: async (request, reply) => {
      const { id } = request.params;
      const customer = await fastify.prisma.customer.findUnique({
        where: { id },
      });

      if (!customer) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `Customer with id ${id} not found`,
        });
      }

      return customer;
    },
  });

  // UPDATE - PATCH /api/customers/:id
  fastify.patch<{ Params: CustomerParams; Body: UpdateCustomerBody }>('/:id', {
    schema: updateCustomerSchema,
    handler: async (request, reply) => {
      const { id } = request.params;
      const data = request.body;

      const customer = await fastify.prisma.customer.findUnique({ where: { id } });

      if (!customer) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `Customer with id ${id} not found`,
        });
      }

      const updatedCustomer = await fastify.prisma.customer.update({
        where: { id },
        data: { ...data, lastActivity: new Date() },
      });

      return updatedCustomer;
    },
  });

  // DELETE - DELETE /api/customers/:id
  fastify.delete<{ Params: CustomerParams }>('/:id', {
    schema: deleteCustomerSchema,
    handler: async (request, reply) => {
      const { id } = request.params;

      const customer = await fastify.prisma.customer.findUnique({ where: { id } });

      if (!customer) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: `Customer with id ${id} not found`,
        });
      }

      await fastify.prisma.customer.delete({ where: { id } });

      return reply.status(204).send();
    },
  });
};

export default customerRoutes;