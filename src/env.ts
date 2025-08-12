import { z } from "zod";

const requiredSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
});

const optionalSchema = z.object({
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_ID: z.string().min(1).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GOOGLE_API_KEY: z.string().min(1).optional(),
});

const required = requiredSchema.safeParse(process.env);
if (!required.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Missing required env vars:", required.error.flatten().fieldErrors);
  throw new Error("Missing required environment variables");
}

const optional = optionalSchema.safeParse(process.env);
if (!optional.success) {
  // eslint-disable-next-line no-console
  console.warn("⚠️ Optional env vars invalid:", optional.error.flatten().fieldErrors);
}

export const env = { ...required.data, ...(optional.success ? optional.data : {}) } as const;

export type Env = typeof env; 