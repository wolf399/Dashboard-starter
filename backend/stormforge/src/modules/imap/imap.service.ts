import { ImapFlow } from 'imapflow';
import { PrismaClient } from '@prisma/client';
import { simpleParser } from 'mailparser';

const prisma = new PrismaClient();

const getImapEmailBody = async (source: Buffer): Promise<string> => {
  try {
    const parsed = await simpleParser(source);
    let html = parsed.html || parsed.textAsHtml || parsed.text || '';

    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const attachment of parsed.attachments) {
        if (attachment.cid) {
          // Strip angle brackets AND escape special regex chars (dots, plus, etc.)
          const cid = attachment.cid
            .replace(/[<>]/g, '')
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const base64 = attachment.content.toString('base64');
          const mime = attachment.contentType;
          html = html.replace(
            new RegExp(`cid:${cid}`, 'gi'),
            `data:${mime};base64,${base64}`
          );
        }
      }
    }

    return html;
  } catch {
    return source.toString('utf-8');
  }
};

export async function checkImapForOrg(org: any) {
  const client = new ImapFlow({
    host: org.imapHost || 'imap.gmail.com',
    port: org.imapPort || 993,
    secure: true,
    auth: {
      user: org.imapEmail,
      pass: org.imapPassword,
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const since = org.lastImapSync
        ? new Date(org.lastImapSync)
        : new Date(Date.now() - 5 * 60 * 1000);

      const messages = [];
      for await (const msg of client.fetch(
        { seen: false, since },
        { envelope: true, uid: true, source: true }
      )) {
        messages.push(msg);
      }

      for (const msg of messages) {
        const fromEmail = msg.envelope.from?.[0]?.address || '';
        const fromName  = msg.envelope.from?.[0]?.name || fromEmail;
        const subject   = msg.envelope.subject || 'No Subject';

        if (!fromEmail) continue;
        if (fromEmail.toLowerCase() === org.imapEmail.toLowerCase()) continue;

        try {
          await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'], { uid: true });
        } catch (flagErr) {
          console.warn('Could not mark email as seen');
        }

        let customer = await prisma.customer.findFirst({
          where: { email: fromEmail, organizationId: org.id },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              name: fromName || fromEmail,
              email: fromEmail,
              status: 'ACTIVE',
              organizationId: org.id,
            },
          });
        }

        const existing = await prisma.ticket.findFirst({
          where: {
            organizationId: org.id,
            subject,
            customerId: customer.id,
            source: 'EMAIL',
            createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
          },
        });

        if (existing) continue;

        const ticket = await prisma.ticket.create({
          data: {
            subject,
            description: `Email received from ${fromName} <${fromEmail}>`,
            status: 'OPEN',
            priority: 'MEDIUM',
            source: 'EMAIL',
            organizationId: org.id,
            customerId: customer.id,
          },
        });

        const body = msg.source
          ? await getImapEmailBody(msg.source)
          : `Email from ${fromName} <${fromEmail}>:\n\nSubject: ${subject}`;

        await prisma.message.create({
          data: {
            body,
            senderType: 'CUSTOMER',
            ticketId: ticket.id,
          },
        });

        console.log(`New ticket from email: ${subject} — org: ${org.name}`);
      }

      await prisma.organization.update({
        where: { id: org.id },
        data: { lastImapSync: new Date() },
      });

    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err: any) {
    console.error(`IMAP error for org ${org.name}:`, err.message);
    throw err;
  }
}

export async function startImapPoller() {
  console.log('Starting IMAP poller...');

  const poll = async () => {
    try {
      const orgs = await prisma.organization.findMany({
        where: {
          imapEnabled: true,
          imapEmail: { not: null },
          imapPassword: { not: null },
        },
      });

      for (const org of orgs) {
        try {
          await checkImapForOrg(org);
        } catch (err: any) {
          console.error(`IMAP error for org ${org.name}:`, err.message);
        }
      }
    } catch (err) {
      console.error('Poller error:', err);
    }
  };

  setTimeout(async () => {
    await poll();
    setInterval(poll, 60 * 1000);
  }, 15000);
}