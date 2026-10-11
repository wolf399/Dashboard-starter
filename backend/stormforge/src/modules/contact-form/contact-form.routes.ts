import { FastifyInstance } from 'fastify';
import sgMail from '@sendgrid/mail';

interface ContactFormBody {
  name: string;
  email: string;
  company?: string;
  message: string;
}

// Public endpoint for the marketing landing page's contact form — intentionally
// has NO jwtVerify(), unlike every other route in /modules, since visitors
// submitting this form aren't logged in.
//
// This does NOT touch the database or create a CRM Contact — it just emails
// a notification (via SendGrid) to CONTACT_FORM_NOTIFY_EMAIL so you can follow
// up manually. If you later want submissions tracked as leads in the CRM, that's
// a separate, deliberate change — not something this route does on its own.
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const contactFormRoutes = async (fastify: FastifyInstance) => {
  fastify.post<{ Body: ContactFormBody }>('/', {
    // Tighter than the global 100/min limiter, since this route has no auth
    // gating who can call it.
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    handler: async (request, reply) => {
      try {
        const { name, email, company, message } = request.body || ({} as ContactFormBody);

        if (!name?.trim()) {
          return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Name is required.' });
        }
        if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          return reply.status(400).send({ error: 'BAD_REQUEST', message: 'A valid email is required.' });
        }
        if (!message?.trim()) {
          return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Message is required.' });
        }
        if (name.length > 200 || (company && company.length > 200) || message.length > 5000) {
          return reply.status(400).send({ error: 'BAD_REQUEST', message: 'One of the fields is too long.' });
        }

        const apiKey = process.env.SENDGRID_API_KEY;
        const notifyEmail = process.env.CONTACT_FORM_NOTIFY_EMAIL;
        const fromEmail = process.env.SENDGRID_FROM_EMAIL || notifyEmail;

        if (!apiKey || !notifyEmail || !fromEmail) {
          fastify.log.error(
            'Contact form is missing SENDGRID_API_KEY, CONTACT_FORM_NOTIFY_EMAIL, or SENDGRID_FROM_EMAIL.'
          );
          return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong.' });
        }

        sgMail.setApiKey(apiKey);

        await sgMail.send({
          to: notifyEmail,
          from: fromEmail,
          replyTo: email.trim(),
          subject: `New website inquiry from ${name.trim()}`,
          text: [
            `Name: ${name.trim()}`,
            `Email: ${email.trim()}`,
            `Company: ${company?.trim() || '—'}`,
            '',
            'Message:',
            message.trim(),
          ].join('\n'),
          html: `
            <div style="font-family: sans-serif; max-width: 600px;">
              <h2 style="margin-bottom: 4px;">New website inquiry</h2>
              <p style="color:#6b7280; margin-top:0;">Submitted via the AgentCRM contact form</p>
              <table style="border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding:4px 12px 4px 0; color:#6b7280;">Name</td><td>${escapeHtml(name.trim())}</td></tr>
                <tr><td style="padding:4px 12px 4px 0; color:#6b7280;">Email</td><td>${escapeHtml(email.trim())}</td></tr>
                <tr><td style="padding:4px 12px 4px 0; color:#6b7280;">Company</td><td>${escapeHtml(company?.trim() || '—')}</td></tr>
              </table>
              <p style="color:#6b7280; margin-bottom:4px;">Message:</p>
              <p style="white-space: pre-wrap;">${escapeHtml(message.trim())}</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
              <p style="color:#9ca3af;font-size:12px;">Reply directly to this email to respond to ${escapeHtml(name.trim())}.</p>
            </div>
          `,
        });

        return reply.status(200).send({ message: 'ok' });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong.' });
      }
    },
  });
};

export default contactFormRoutes;