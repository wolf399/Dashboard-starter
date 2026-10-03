import { FastifyInstance } from 'fastify';

// Simple, deterministic score (0-100) — no AI call needed, cheap to run on
// every activity. Three ingredients:
//   - Recency: how long since anything happened on this contact (decays over 30 days)
//   - Engagement: how many calls/notes exist (capped, so one chatty note-taker doesn't dominate)
//   - Pipeline weight: value * probability summed across their open deals
const RECENCY_MAX = 40;
const ENGAGEMENT_MAX = 30;
const ENGAGEMENT_CAP = 10;
const PIPELINE_MAX = 30;
const PIPELINE_NORMALIZE = 5000; // $ weighted-pipeline value that maxes out the pipeline score — tune to your typical deal size

export async function recalculateLeadScore(fastify: FastifyInstance, contactId: string) {
  const contact = await fastify.prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return;

  const [callCount, noteCount, deals] = await Promise.all([
    fastify.prisma.callLog.count({ where: { contactId } }),
    fastify.prisma.contactNote.count({ where: { contactId } }),
    fastify.prisma.deal.findMany({ where: { contactId, stage: { notIn: ['WON', 'LOST'] } } }),
  ]);

  const lastActivity = contact.lastActivityAt ?? contact.createdAt;
  const daysSince = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, RECENCY_MAX - (daysSince / 30) * RECENCY_MAX);

  const engagementCount = Math.min(callCount + noteCount, ENGAGEMENT_CAP);
  const engagementScore = (engagementCount / ENGAGEMENT_CAP) * ENGAGEMENT_MAX;

  const pipelineWeight = deals.reduce((sum, d) => sum + ((d.value ?? 0) * ((d.probability ?? 50) / 100)), 0);
  const pipelineScore = Math.min(pipelineWeight / PIPELINE_NORMALIZE, 1) * PIPELINE_MAX;

  const total = Math.round(recencyScore + engagementScore + pipelineScore);

  await fastify.prisma.contact.update({
    where: { id: contactId },
    data: { leadScore: total },
  });
}

export async function bumpContactActivity(fastify: FastifyInstance, contactId: string) {
  await fastify.prisma.contact.update({
    where: { id: contactId },
    data: { lastActivityAt: new Date() },
  });
  await recalculateLeadScore(fastify, contactId);
}