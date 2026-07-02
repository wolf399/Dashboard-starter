import { FastifyInstance } from 'fastify';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

interface GoogleAuthBody {
  code: string;
}

const generateSlug = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).slice(2, 7);
};

// Exchange an authorization code obtained via Google Identity Services'
// popup code flow (ux_mode: 'popup') for tokens. Popup-flow clients use the
// literal string "postmessage" as their redirect_uri.
const exchangeCode = async (code: string) => {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: 'postmessage',
      grant_type: 'authorization_code',
    }),
  });
  return res.json();
};

const getUserInfo = async (accessToken: string) => {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
};

const googleAuthRoutes = async (fastify: FastifyInstance) => {
  // Public: lets the frontend initialize Google Identity Services without
  // needing the client ID baked into the frontend build.
  fastify.get('/google/client-id', async () => ({ clientId: CLIENT_ID }));

  // POST /api/auth/google — handles the Google OAuth callback (authorization code)
  fastify.post<{ Body: GoogleAuthBody }>('/google', async (request, reply) => {
    try {
      const { code } = request.body || ({} as GoogleAuthBody);
      if (!code) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Missing authorization code' });
      }

      const tokens: any = await exchangeCode(code);
      if (!tokens.access_token) {
        fastify.log.error(tokens);
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Google authentication failed' });
      }

      const profile: any = await getUserInfo(tokens.access_token);
      if (!profile.email) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Could not retrieve Google account email' });
      }

      let user = await fastify.prisma.user.findFirst({
        where: { OR: [{ googleId: profile.id }, { email: profile.email }] },
        include: { organization: true },
      });

      if (user) {
        if (!user.googleId) {
          user = await fastify.prisma.user.update({
            where: { id: user.id },
            data: { googleId: profile.id },
            include: { organization: true },
          });
        }
      } else {
        const orgName = `${profile.name || profile.email}'s Organization`;
        const slug = generateSlug(orgName);
        const org = await fastify.prisma.organization.create({
          data: {
            name: orgName,
            slug,
            inboundEmail: `552e0efa87304ddc1f27+${slug}@cloudmailin.net`,
          },
        });

        user = await fastify.prisma.user.create({
          data: {
            name: profile.name || profile.email,
            email: profile.email,
            googleId: profile.id,
            role: 'ADMIN',
            organizationId: org.id,
          },
          include: { organization: true },
        });
      }

      const token = fastify.jwt.sign(
        { id: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
        { expiresIn: '7d' }
      );

      return reply.send({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
        },
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' });
    }
  });
};

export default googleAuthRoutes;
