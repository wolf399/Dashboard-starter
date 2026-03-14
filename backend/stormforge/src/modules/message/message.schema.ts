export const schemas = {
  message: {
    $id: 'message',
    type: 'object',
    properties: {
      id:         { type: 'string' },
      body:       { type: 'string' },
      senderType: { type: 'string', 
        enum: ['AGENT', 'CUSTOMER', 
          'NOTE', 'SYSTEM'] },
      ticketId:   { type: 'string' },
      createdAt:  { type: 'string' },
    },
  },

  createMessageBody: {
    $id: 'createMessageBody',
    type: 'object',
    required: ['body', 'senderType', 'ticketId'],
    properties: {
      body:       { type: 'string', minLength: 1 },
      senderType: { type: 'string', enum: ['AGENT', 'CUSTOMER', 'NOTE', 'SYSTEM'] },
      ticketId:   { type: 'string' },
    },
  },
  createMessageResponse: {
    $id: 'createMessageResponse',
    allOf: [{ $ref: 'message' }],
  },

  getMessageParams: {
    $id: 'getMessageParams',
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
  getMessageResponse: {
    $id: 'getMessageResponse',
    allOf: [{ $ref: 'message' }],
  },

  getMessagesByTicketParams: {
    $id: 'getMessagesByTicketParams',
    type: 'object',
    required: ['ticketId'],
    properties: { ticketId: { type: 'string' } },
  },
  getMessagesResponse: {
    $id: 'getMessagesResponse',
    type: 'object',
    properties: {
      messages: {
        type: 'array',
        items: { $ref: 'message' },
      },
    },
  },

  deleteMessageParams: {
    $id: 'deleteMessageParams',
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
};

export const schemasList = Object.values(schemas);

export const createMessageSchema = {
  body: { $ref: 'createMessageBody' },
  response: { 201: { $ref: 'createMessageResponse' } },
};

export const getMessagesByTicketSchema = {
  params: { $ref: 'getMessagesByTicketParams' },
  response: { 200: { $ref: 'getMessagesResponse' } },
};

export const getMessageSchema = {
  params: { $ref: 'getMessageParams' },
  response: { 200: { $ref: 'getMessageResponse' } },
};

export const deleteMessageSchema = {
  params: { $ref: 'deleteMessageParams' },
};