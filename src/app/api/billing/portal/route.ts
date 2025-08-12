import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function GET() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const customerId = process.env.STRIPE_TEST_CUSTOMER_ID; // TODO: replace with real customer ID from DB
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!customerId) throw new Error("STRIPE_TEST_CUSTOMER_ID is not set");

  const stripe = new Stripe(secretKey, { apiVersion: "2025-07-30.basil" });
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings`,
  });
  return NextResponse.redirect(session.url, { status: 303 });
} 