export const schemas = {
  task: {
    $id: 'task',
    type: 'object',
    properties: {
      id:          { type: 'string' },
      title:       { type: 'string' },
      description: { type: 'string', nullable: true },
      dueDate:     { type: 'string', nullable: true },
      priority:    { type: 'string' },
      status:      { type: 'string' },
      createdAt:   { type: 'string' },
      updatedAt:   { type: 'string' },
      assignedToId: { type: 'string', nullable: true },
      ticketId:    { type: 'string', nullable: true },
      createdById: { type: 'string' },
    },
  },

  createTaskBody: {
    $id: 'createTaskBody',
    type: 'object',
    required: ['title', 'createdById'],
    properties: {
      title:        { type: 'string', minLength: 1, maxLength: 200 },
      description:  { type: 'string' },
      dueDate:      { type: 'string', nullable: true },
      priority:     { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      assignedToId: { type: 'string', nullable: true },
      ticketId:     { type: 'string', nullable: true },
      createdById:  { type: 'string' },
    },
  },

  updateTaskBody: {
    $id: 'updateTaskBody',
    type: 'object',
    properties: {
      title:        { type: 'string', minLength: 1, maxLength: 200 },
      description:  { type: 'string' },
      dueDate:      { type: 'string', nullable: true },
      priority:     { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
      status:       { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] },
      assignedToId: { type: 'string', nullable: true },
    },
  },

  taskParams: {
    $id: 'taskParams',
    type: 'object',
    required: ['id'],
    properties: { id: { type: 'string' } },
  },
};

export const schemasList = Object.values(schemas);

export const createTaskSchema = { body: { $ref: 'createTaskBody' } };
export const updateTaskSchema = { params: { $ref: 'taskParams' }, body: { $ref: 'updateTaskBody' } };
export const deleteTaskSchema = { params: { $ref: 'taskParams' } };
export const getTaskSchema    = { params: { $ref: 'taskParams' } };