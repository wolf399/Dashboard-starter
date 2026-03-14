export const schemas = {
  registerBody: {
    $id: 'registerBody',
    type: 'object',
    required: ['email', 'password', 'name'],
    properties: {
      name:     { type: 'string', minLength: 1, maxLength: 100 },
      email:    { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      role:     { type: 'string', enum: ['ADMIN', 'AGENT'] },
    },
  },

  loginBody: {
    $id: 'loginBody',
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email:    { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
  },

  authResponse: {
    $id: 'authResponse',
    type: 'object',
    properties: {
      token: { type: 'string' },
      user: {
        type: 'object',
        properties: {
          id:    { type: 'string' },
          name:  { type: 'string' },
          email: { type: 'string' },
          role:  { type: 'string' },
        },
      },
    },
  },
};

export const schemasList = Object.values(schemas);

export const registerSchema = {
  body: { $ref: 'registerBody' },
  response: { 201: { $ref: 'authResponse' } },
};

export const loginSchema = {
  body: { $ref: 'loginBody' },
  response: { 200: { $ref: 'authResponse' } },
};