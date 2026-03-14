export const schemas = {
  customer: {
    $id: 'customer',
    type: 'object',
    properties: {
      id:           { type: 'string' },
      name:         { type: 'string' },
      email:        { type: 'string', nullable: true },
      phone:        { type: 'string', nullable: true },
      company:      { type: 'string', nullable: true },
      status:       { type: 'string' },
      tags:         { type: 'string', nullable: true },
      lastActivity: { type: 'string' },
      createdAt:    { type: 'string' },
      updatedAt:    { type: 'string' },
    },
  },

  createCustomerBody: {
    $id: 'createCustomerBody',
    type: 'object',
    required: ['name'],
    properties: {
      name:    { type: 'string', minLength: 1, maxLength: 100 },
      email:   { type: 'string', format: 'email', nullable: true },
      phone:   { type: 'string', nullable: true },
      company: { type: 'string', nullable: true },
      tags:    { type: 'string', nullable: true },
    },
  },
  createCustomerResponse: {
    $id: 'createCustomerResponse',
    allOf: [{ $ref: 'customer' }],
  },

  getCustomerParams: {
    $id: 'getCustomerParams',
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  getCustomerResponse: {
    $id: 'getCustomerResponse',
    allOf: [{ $ref: 'customer' }],
  },

  updateCustomerParams: {
    $id: 'updateCustomerParams',
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  updateCustomerBody: {
    $id: 'updateCustomerBody',
    type: 'object',
    properties: {
      name:    { type: 'string', minLength: 1, maxLength: 100 },
      email:   { type: 'string', format: 'email', nullable: true },
      phone:   { type: 'string', nullable: true },
      company: { type: 'string', nullable: true },
      status:  { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
      tags:    { type: 'string', nullable: true },
    },
  },

  deleteCustomerParams: {
    $id: 'deleteCustomerParams',
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },

  getCustomersResponse: {
    $id: 'getCustomersResponse',
    type: 'object',
    properties: {
      customers: {
        type: 'array',
        items: { $ref: 'customer' },
      },
    },
  },
};

export const schemasList = Object.values(schemas);

export const createCustomerSchema = {
  body: { $ref: 'createCustomerBody' },
  response: { 201: { $ref: 'createCustomerResponse' } },
};

export const getCustomersSchema = {
  response: { 200: { $ref: 'getCustomersResponse' } },
};

export const getCustomerSchema = {
  params: { $ref: 'getCustomerParams' },
  response: { 200: { $ref: 'getCustomerResponse' } },
};

export const updateCustomerSchema = {
  params: { $ref: 'updateCustomerParams' },
  body: { $ref: 'updateCustomerBody' },
  response: { 200: { $ref: 'getCustomerResponse' } },
};

export const deleteCustomerSchema = {
  params: { $ref: 'deleteCustomerParams' },
};