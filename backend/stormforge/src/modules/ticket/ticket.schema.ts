export const schemas = {
  ticket: {
    $id: 'ticket',
    type: 'object',
    properties: {
      id:              { type: 'string' },
      subject:         { type: 'string' },
      description:     { type: 'string' },
      status:          { type: 'string' },
      priority:        { type: 'string' },
      customerId:      { type: 'string' },
      assignedAgentId: { type: 'string', nullable: true },
      createdAt:       { type: 'string' },
      updatedAt:       { type: 'string' },
    },
  },

  createTicketBody: {
    $id: 'createTicketBody',
    type: 'object',
    required: ['subject', 'description', 'customerId'],
    properties: {
      subject:         { type: 'string', minLength: 1, maxLength: 200 },
      description:     { type: 'string', minLength: 1 },
      priority:        { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      customerId:      { type: 'string' },
      assignedAgentId: { type: 'string', nullable: true },
    },
  },
  createTicketResponse: {
    $id: 'createTicketResponse',
    allOf: [{ $ref: 'ticket' }],
  },

  getTicketParams: {
    $id: 'getTicketParams',
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  getTicketResponse: {
    $id: 'getTicketResponse',
    allOf: [{ $ref: 'ticket' }],
  },

  updateTicketParams: {
    $id: 'updateTicketParams',
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  updateTicketBody: {
    $id: 'updateTicketBody',
    type: 'object',
    properties: {
      subject:         { type: 'string', minLength: 1, maxLength: 200 },
      description:     { type: 'string' },
      status:          { type: 'string', enum: ['OPEN', 'PENDING', 'CLOSED'] },
      priority:        { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      assignedAgentId: { type: 'string', nullable: true },
    },
  },

  deleteTicketParams: {
    $id: 'deleteTicketParams',
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },

  getTicketsResponse: {
    $id: 'getTicketsResponse',
    type: 'object',
    properties: {
      tickets: {
        type: 'array',
        items: { $ref: 'ticket' },
      },
    },
  },
};

export const schemasList = Object.values(schemas);

export const createTicketSchema = {
  body: { $ref: 'createTicketBody' },
  response: { 201: { $ref: 'createTicketResponse' } },
};

export const getTicketsSchema = {};

export const getTicketSchema = {
  params: { $ref: 'getTicketParams' },
};

export const updateTicketSchema = {
  params: { $ref: 'updateTicketParams' },
  body: { $ref: 'updateTicketBody' },
  response: { 200: { $ref: 'getTicketResponse' } },
};

export const deleteTicketSchema = {
  params: { $ref: 'deleteTicketParams' },
};