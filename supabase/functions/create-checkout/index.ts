import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CheckoutRequest {
  priceId: string;
  quantity?: number;
  customerEmail?: string;
  userId?: string;
  returnUrl: string;
  environment: StripeEnv;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as CheckoutRequest;

    if (!body.priceId || !/^[a-zA-Z0-9_-]+$/.test(body.priceId)) {
      throw new Error("Invalid priceId");
    }
    if (!body.returnUrl) throw new Error("Missing returnUrl");
    if (body.environment !== "sandbox" && body.environment !== "live") {
      throw new Error("Invalid environment");
    }

    const stripe = createStripeClient(body.environment);

    const prices = await stripe.prices.list({ lookup_keys: [body.priceId] });
    if (!prices.data.length) throw new Error("Price not found");
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: body.quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: body.returnUrl,
      ...(body.customerEmail && { customer_email: body.customerEmail }),
      ...(body.userId && {
        metadata: { userId: body.userId },
        ...(isRecurring && {
          subscription_data: { metadata: { userId: body.userId } },
        }),
      }),
    });

    return new Response(
      JSON.stringify({ clientSecret: session.client_secret }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("create-checkout error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
