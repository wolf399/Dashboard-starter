import { FastifyInstance } from 'fastify';

const YCLOUD_API_BASE = 'https://api.ycloud.com/v2';

// NOTE: YCloud signs webhooks with a "YCloud-Signature" header (HMAC-SHA256 over
// the raw request body). Verifying it requires the raw, unparsed body, which needs
// the @fastify/raw-body plugin registered — not currently in server.ts. Skipping
// verification for now (org is still matched by business phone number, so a random
// POST can't silently attach to the wrong org's tickets). Add signature verification
// once @fastify/raw-body is wired in.

// ── Send an outbound WhatsApp text message via YCloud ──
export const sendWhatsAppMessage = async (
  apiKey: string,
  from: string, // your business number, e.g. "+15553974874"
  to: string,   // customer's number
  body: string
) => {
  const res = await fetch(`${YCLOUD_API_BASE}/whatsapp/messages`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      type: 'text',
      text: { body },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`YCloud send error: ${res.status} ${errText}`);
  }
  return res.json();
};

export default async function whatsappRoutes(fastify: FastifyInstance) {

  // ── Connect / save WhatsApp credentials for an org (manual entry — no OAuth flow) ──
  fastify.post('/connect', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const { apiKey, phoneNumber, wabaId, webhookSecret } = request.body as any;
    if (!apiKey || !phoneNumber) {
      return reply.status(400).send({ error: 'apiKey and phoneNumber are required' });
    }

    await fastify.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        whatsappApiKey: apiKey,
        whatsappPhoneNumber: phoneNumber,
        whatsappWabaId: wabaId || null,
        whatsappWebhookSecret: webhookSecret || null,
        whatsappConnected: true,
      },
    });

    return { success: true };
  });

  fastify.get('/status', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    const org = await fastify.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { whatsappPhoneNumber: true, whatsappConnected: true, whatsappWabaId: true },
    });
    return org;
  });

  fastify.post('/disconnect', async (request: any, reply: any) => {
    const user = await request.jwtVerify() as any;
    await fastify.prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        whatsappApiKey: null,
        whatsappPhoneNumber: null,
        whatsappWabaId: null,
        whatsappWebhookSecret: null,
        whatsappConnected: false,
      },
    });
    return { success: true };
  });

  // ── Public webhook — YCloud posts inbound messages here ──
  // Register this exact URL (e.g. https://your-backend.vercel.app/api/whatsapp/webhook)
  // in YCloud's dashboard once deployed.
  fastify.post('/webhook', async (request: any, reply: any) => {
    try {
      const event = request.body as any;

      if (event.type !== 'whatsapp.inbound_message.received') {
        // Ignore delivery/status update events etc. for now
        return reply.status(200).send({ received: true });
      }

      const msg = event.whatsappInboundMessage;
      const businessNumber = msg?.to; // matches org.whatsappPhoneNumber
      const customerNumber = msg?.from;
      const bodyText = msg?.text?.body || '[Unsupported message type]';
      const customerName = msg?.customerProfile?.name || customerNumber;

      if (!businessNumber || !customerNumber) {
        return reply.status(200).send({ received: true });
      }

      const org = await fastify.prisma.organization.findFirst({
        where: { whatsappPhoneNumber: businessNumber, whatsappConnected: true },
      });
      if (!org) {
        console.error(`WhatsApp webhook: no org found for business number ${businessNumber}`);
        return reply.status(200).send({ received: true });
      }

      // ── Find or create customer ──
      let customer = await fastify.prisma.customer.findFirst({
        where: { phone: customerNumber, organizationId: org.id },
      });
      if (!customer) {
        customer = await fastify.prisma.customer.create({
          data: {
            name: customerName,
            phone: customerNumber,
            status: 'ACTIVE',
            organizationId: org.id,
          },
        });
      }

      // ── Find or create ticket (one open ticket per customer thread, like Gmail's threadId) ──
      let ticket = await fastify.prisma.ticket.findFirst({
        where: {
          organizationId: org.id,
          customerId: customer.id,
          source: 'WHATSAPP',
          status: { not: 'CLOSED' },
        },
      });

      if (!ticket) {
        ticket = await fastify.prisma.ticket.create({
          data: {
            subject: `WhatsApp — ${customerName}`,
            description: `WhatsApp conversation with ${customerName} (${customerNumber})`,
            status: 'OPEN',
            priority: 'MEDIUM',
            source: 'WHATSAPP',
            organizationId: org.id,
            customerId: customer.id,
          },
        });
      }

      await fastify.prisma.message.create({
        data: {
          body: bodyText,
          senderType: 'CUSTOMER',
          ticketId: ticket.id,
        },
      });

      console.log(`WhatsApp message stored for org ${org.id}, ticket ${ticket.id}`);
      return reply.status(200).send({ received: true });
    } catch (err: any) {
      console.error('WhatsApp webhook error:', err.message);
      // Still return 200 so YCloud doesn't retry-storm on our bugs while we debug
      return reply.status(200).send({ received: true, error: err.message });
    }
  });
}