const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';


const getToken = () => localStorage.getItem('token');

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// AUTH
export const login = async (email, password) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
};

export const register = async (name, email, password, role = 'AGENT', inviteToken = null, organizationName = null) => {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role, inviteToken, organizationName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// CUSTOMERS
export const getCustomers = async () => {
  const res = await fetch(`${BASE_URL}/customers`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.customers;
};

export const createCustomer = async (customer) => {
  const res = await fetch(`${BASE_URL}/customers`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(customer),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// TICKETS
export const getTickets = async () => {
  const res = await fetch(`${BASE_URL}/tickets`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.tickets;
};

export const createTicket = async (ticket) => {
  const res = await fetch(`${BASE_URL}/tickets`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(ticket),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateTicket = async (id, updates) => {
  const res = await fetch(`${BASE_URL}/tickets/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// MESSAGES
export const getMessages = async (ticketId) => {
  const res = await fetch(`${BASE_URL}/messages/ticket/${ticketId}`, {
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.messages;
};

export const sendMessage = async (ticketId, body, senderType = 'AGENT') => {
  const res = await fetch(`${BASE_URL}/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ ticketId, body, senderType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};
// TASKS
export const getTasks = async () => {
  const res = await fetch(`${BASE_URL}/tasks`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.tasks;
};

export const createTask = async (task) => {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(task),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const updateTask = async (id, updates) => {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const deleteTask = async (id) => {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message);
  }
};

export const getUsers = async () => {
  const res = await fetch(`${BASE_URL}/users`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.users;
};
// AI
export const aiSuggestReplies = async ({ subject, customerName, conversation }) => {
  const res = await fetch(`${BASE_URL}/ai/suggest`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ subject, customerName, conversation }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.suggestions;
};

export const aiSummarize = async ({ subject, conversation }) => {
  const res = await fetch(`${BASE_URL}/ai/summarize`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ subject, conversation }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.summary;
};

export const aiDetectPriority = async ({ subject, description }) => {
  const res = await fetch(`${BASE_URL}/ai/priority`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ subject, description }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data.priority;
};

export const aiRouteTicket = async ({ subject, description, agents }) => {
  const res = await fetch(`${BASE_URL}/ai/route`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ subject, description, agents }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const aiTranslate = async ({ text }) => {
  const res = await fetch(`${BASE_URL}/ai/translate`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};
export const sendEmail = async ({ to, subject, text, ticketId }) => {
  const res = await fetch(`${BASE_URL}/email/send`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ to, subject, text, ticketId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};
// INVITES
export const generateInvite = async () => {
  const res = await fetch(`${BASE_URL}/invites/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const validateInvite = async (token) => {
  const res = await fetch(`${BASE_URL}/invites/validate/${token}`);
  const data = await res.json();
  return data;
};

export const markInviteUsed = async (token) => {
  const res = await fetch(`${BASE_URL}/invites/use/${token}`, {
    method: 'PATCH',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const getOrganization = async () => {
  const res = await fetch(`${BASE_URL}/organization`, {
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

// IMAP
export const connectImap = async ({ email, password, host, port }) => {
  const res = await fetch(`${BASE_URL}/imap/connect`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password, host, port }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Connection failed');
  return data;
};

export const disconnectImap = async () => {
  const res = await fetch(`${BASE_URL}/imap/disconnect`, {
    method: 'POST',
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const getImapStatus = async () => {
  const res = await fetch(`${BASE_URL}/imap/status`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};

export const syncImap = async () => {
  const res = await fetch(`${BASE_URL}/imap/sync`, {
    method: 'POST',
    headers: headers(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
};