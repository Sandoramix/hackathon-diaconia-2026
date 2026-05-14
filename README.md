# Diaconia

Web platform for managing students in a community structure. Tutors manage events, tasks, broadcasts, and monitor student activity. Students participate, chat with tutors, and receive communications.

## Stack

- **Next.js 15** (Pages Router) + **TypeScript**
- **tRPC v11** — end-to-end typesafe API
- **Prisma** — ORM, PostgreSQL
- **NextAuth v5** — credentials-based auth (JWT)
- **Tailwind CSS v4** + shadcn/ui
- **pnpm** — package manager

---

## Local development

### Prerequisites

- Node.js 20+
- pnpm 10+ (`npm install -g pnpm`)
- PostgreSQL database (local or remote)

### 1. Clone and install

```bash
git clone https://github.com/Sandoramix/hackathon-diaconia-2026.git
cd hackathon-diaconia-2026
pnpm install
```

### 2. Environment variables

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

```env
# Generate with: npx auth secret
AUTH_SECRET="your-random-secret-here"

# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:5432/diaconia"
```

### 3. Database setup

Push the schema to your database:

```bash
pnpm db:push
```

Seed with initial data (creates a default structure, tutor, and students):

```bash
pnpm db:seed
```

> Default credentials after seed: check `prisma/seed.ts` for the seeded username/password.

### 4. Start dev server

```bash
pnpm dev
```

App runs at [http://localhost:3000](http://localhost:3000).

---

## Available scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start dev server with Turbopack |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm typecheck` | TypeScript type check |
| `pnpm db:push` | Push schema changes to DB (no migration history) |
| `pnpm db:generate` | Run Prisma migrations (requires shadow DB) |
| `pnpm db:migrate` | Deploy pending migrations |
| `pnpm db:studio` | Open Prisma Studio (visual DB browser) |

---

## Production deployment

### Vercel (recommended)

1. Push repo to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Set environment variables in the Vercel dashboard:
   - `DATABASE_URL` — PostgreSQL connection string
   - `AUTH_SECRET` — run `npx auth secret` to generate
4. Deploy — Vercel runs `pnpm build` automatically

> **Note:** Vercel serverless functions don't support `prisma migrate dev` (needs shadow DB). Use `pnpm db:push` or `pnpm db:migrate` for schema changes.

### Self-hosted (VPS / Docker)

```bash
pnpm install
pnpm build

# Apply schema changes
DATABASE_URL="..." pnpm db:push

# Start
NODE_ENV=production AUTH_SECRET="..." DATABASE_URL="..." pnpm start
```

Or use a `.env` file and just run `pnpm start`.

---

## Project structure

```
prisma/
  schema.prisma          # Database models
  seed.ts                # Initial seed data

src/
  server/
    api/routers/         # tRPC routers (user, event, task, chat, alarm, broadcast, ...)
    alarm-config.ts      # Alarm thresholds — edit here to tune alarm rules
    auth/                # NextAuth config
    db.ts                # Prisma client singleton
  pages/
    tutor/               # Tutor pages
    studente/            # Student pages
    auth/                # Login / password change
  layouts/
    DashboardLayout.tsx  # Shared layout — bottom nav + header icons
  components/ui/         # shadcn/ui components
```

---

## Alarm configuration

Thresholds are code-only — no UI. Edit `src/server/alarm-config.ts`:

```ts
export const ALARM_CONFIG = {
  inactiveDays: 14,               // days with no activity → INACTIVE alarm
  maxAbandonments: 3,             // task slot unsubscriptions in window → HIGH_ABANDONMENT
  abandonmentLookbackDays: 30,
  minEventParticipationRate: 0.5, // below 50% → LOW_EVENT_PARTICIPATION alarm
  eventParticipationLookbackDays: 30,
  minEventsForParticipationCheck: 2, // min past events before rate is checked
};
```

---

## Roles

| Role | What they can do |
|------|-----------------|
| `STUDENTE` | Chat, events, tasks, feedback, rules, read broadcasts |
| `TUTOR` | Everything above + manage users, alarms, broadcast messages, export student history |
| `ADMIN` | Structure management + all TUTOR features |
