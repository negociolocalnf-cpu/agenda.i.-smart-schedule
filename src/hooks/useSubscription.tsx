import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getStripeEnvironment } from "@/lib/stripe";

export interface Subscription {
  id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  product_id: string;
  price_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
}

const PLAN_LABELS: Record<string, string> = {
  basico_mensal: "Básico",
  profissional_mensal: "Profissional",
  premium_mensal: "Premium",
};

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("environment", getStripeEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(data as Subscription | null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Keep a stable ref to refetch so the realtime effect doesn't re-run
  // every time refetch's identity changes (which caused the channel to be
  // re-created and `.on()` to be called after `.subscribe()`).
  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Realtime: atualiza quando webhook gravar a assinatura
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`sub-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => refetchRef.current()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isActive = (() => {
    if (!subscription) return false;
    const end = subscription.current_period_end
      ? new Date(subscription.current_period_end).getTime()
      : null;
    const future = !end || end > Date.now();
    // Trial NÃO concede acesso — somente pagamentos reais.
    if (["active", "past_due"].includes(subscription.status) && future)
      return true;
    if (subscription.status === "canceled" && end && end > Date.now()) return true;
    return false;
  })();

  const planName = subscription
    ? PLAN_LABELS[subscription.price_id] ?? subscription.price_id
    : null;

  return { subscription, loading, isActive, planName, refetch };
}
