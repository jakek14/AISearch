import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(secretKey, { apiVersion: "2025-07-30.basil" });
}

async function createCheckoutSession() {
  const price = process.env.STRIPE_PRICE_ID;
  if (!price) throw new Error("STRIPE_PRICE_ID is not set");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl}/settings?upgraded=1`,
    cancel_url: `${appUrl}/settings`,
  });
}

export async function POST() {
  const session = await createCheckoutSession();
  return NextResponse.json({ url: session.url });
}

export async function GET() {
  const session = await createCheckoutSession();
  return NextResponse.redirect(session.url as string, { status: 303 });
} 