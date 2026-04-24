import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }
  return _supabase;
}

interface CheckoutRequest {
  priceId: string;
  quantity?: number;
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
    // Require authenticated user — never trust a client-supplied userId.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = getSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // userId is derived from the verified JWT, not the request body.
    const userId = user.id;
    const customerEmail = user.email ?? undefined;

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: body.quantity || 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      return_url: body.returnUrl,
      ...(customerEmail && { customer_email: customerEmail }),
      metadata: { userId },
      // Hard-block any free trial. Even if a trial is configured on the
      // Stripe price by accident, force the subscription to start paid
      // immediately (trial_period_days: 0 overrides the price-level trial).
      ...(isRecurring && {
        subscription_data: {
          metadata: { userId },
          trial_period_days: 0,
        },
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
    const rawMessage = error instanceof Error ? error.message : "Unknown error";
    // Log full detail server-side only
    console.error("create-checkout error:", rawMessage, error);

    // Map a small set of known/expected errors to safe client messages.
    const safeMap: Record<string, { status: number; message: string }> = {
      "Invalid priceId": { status: 400, message: "Invalid request." },
      "Missing returnUrl": { status: 400, message: "Invalid request." },
      "Invalid environment": { status: 400, message: "Invalid request." },
      "Price not found": { status: 400, message: "Selected plan is unavailable." },
    };
    const mapped = safeMap[rawMessage] ?? {
      status: 500,
      message: "Unable to start checkout. Please try again.",
    };
    return new Response(JSON.stringify({ error: mapped.message }), {
      status: mapped.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
