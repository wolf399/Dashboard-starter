import { FastifyInstance } from 'fastify';
import Groq from 'groq-sdk';

export default async function aiRoutes(fastify: FastifyInstance) {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Suggest replies
  fastify.post('/suggest', async (request: any, reply: any) => {
    const { subject, customerName, conversation } = request.body as {
      subject: string; customerName: string; conversation: string;
    };
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a helpful customer support agent. Based on this support ticket conversation, generate exactly 3 short, professional reply suggestions. Each suggestion should be on a new line starting with a number and period (1. 2. 3.). Keep each reply under 2 sentences. Be empathetic and solution-focused.

Ticket subject: ${subject}
Customer: ${customerName}

Conversation:
${conversation}

Generate 3 reply suggestions:`,
      }],
    });
    const text = response.choices[0]?.message?.content || '';
    const suggestions = text
      .split('\n')
      .filter((line) => /^\d\./.test(line.trim()))
      .map((line) => line.replace(/^\d\.\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3);
    return { suggestions };
  });

  // Summarize ticket
  fastify.post('/summarize', async (request: any, reply: any) => {
    const { subject, conversation } = request.body as {
      subject: string; conversation: string;
    };
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Summarize this customer support ticket in 2 sentences max. Be concise and factual. Focus on the issue and current status.

Ticket: ${subject}
${conversation}`,
      }],
    });
    const summary = response.choices[0]?.message?.content || '';
    return { summary };
  });

  // Auto-detect priority
  fastify.post('/priority', async (request: any, reply: any) => {
    const { subject, description } = request.body as {
      subject: string; description: string;
    };
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: `Based on this support ticket, respond with ONLY one word — either HIGH, MEDIUM, or LOW — indicating the priority level.

Subject: ${subject}
Description: ${description}`,
      }],
    });
    const text = (response.choices[0]?.message?.content || 'MEDIUM').trim().toUpperCase();
    const priority = ['HIGH', 'MEDIUM', 'LOW'].includes(text) ? text : 'MEDIUM';
    return { priority };
  });

  // Smart routing
  fastify.post('/route', async (request: any, reply: any) => {
    const { subject, description, agents } = request.body as {
      subject: string; description: string; agents: { id: string; name: string }[];
    };
    if (!agents?.length) return { agentId: null };
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: `You are a support team manager. Based on this ticket, pick the best agent to handle it. Respond with ONLY the agent's name, nothing else.

Ticket subject: ${subject}
Description: ${description}

Available agents: ${agents.map((a) => a.name).join(', ')}`,
      }],
    });
    const text = (response.choices[0]?.message?.content || '').trim();
    const matched = agents.find((a) => text.toLowerCase().includes(a.name.toLowerCase()));
    return { agentId: matched?.id || null, agentName: matched?.name || null };
  });

  // Translate message
  fastify.post('/translate', async (request: any, reply: any) => {
    const { text } = request.body as { text: string };
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Detect the language of this text and translate it to English. Respond in this exact format:
Language: [detected language]
Translation: [english translation]

Text: ${text}`,
      }],
    });
    const raw = response.choices[0]?.message?.content || '';
    const language = raw.match(/Language:\s*(.+)/)?.[1]?.trim() || 'Unknown';
    const translation = raw.match(/Translation:\s*(.+)/s)?.[1]?.trim() || text;
    return { language, translation };
  });
}