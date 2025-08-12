# AI Search Visibility & Citations (MVP)

Stack: Next.js App Router (TS), Tailwind, shadcn/ui, Prisma(Postgres), Clerk, Stripe, Upstash Redis, BullMQ.

## Getting Started

1) Copy envs

```bash
cp src/env.example .env
```

2) Fill in required environment variables in `.env`.

3) Install deps

```bash
npm install
```

4) Generate Prisma Client

```bash
npm run prisma:generate
```

5) Dev

```bash
npm run dev
```

## Stripe test
- Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, and optionally `STRIPE_TEST_CUSTOMER_ID`.
- Open `/settings` and click Upgrade/Manage.

## Notes
- Clerk middleware protects all routes except: `/sign-in`, `/sign-up`, `/api/health`, `/api/stripe/webhook`.
- DB schema is defined in `prisma/schema.prisma`.
