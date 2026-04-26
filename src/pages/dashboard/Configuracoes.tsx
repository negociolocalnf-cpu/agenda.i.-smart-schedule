import { useState } from "react";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { WhatsappSettingsCard } from "@/components/dashboard/WhatsappSettingsCard";
import { BirthdayAutomationCard } from "@/components/dashboard/BirthdayAutomationCard";

const Configuracoes = () => {
  const { user } = useAuth();
  const { subscription, isActive, planName, loading } = useSubscription();
  const [opening, setOpening] = useState(false);

  const handleOpenPortal = async () => {
    setOpening(true);
    const { data, error } = await supabase.functions.invoke("create-portal-session", {
      body: {
        environment: getStripeEnvironment(),
        returnUrl: `${window.location.origin}/dashboard/configuracoes`,
      },
    });
    setOpening(false);
    if (error || !data?.url) {
      toast.error(error?.message || "Não foi possível abrir o portal");
      return;
    }
    window.open(data.url, "_blank");
  };

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";

  return (
    <>
      <DashboardTopbar title="Configurações" subtitle="Conta e assinatura" />
      <div className="space-y-6 p-6">
        {/* Conta */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-bold">Conta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Informações básicas do seu acesso.
          </p>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-muted-foreground">E-mail</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">ID do usuário</span>
              <span className="font-mono text-xs">{user?.id.slice(0, 8)}…</span>
            </div>
          </div>
        </section>

        {/* Assinatura */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-bold">Assinatura</h2>
          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          ) : isActive && subscription ? (
            <>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Plano {planName} ativo
              </div>
              <div className="mt-5 grid gap-3 text-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{subscription.status}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="text-muted-foreground">Próxima cobrança</span>
                  <span className="font-medium">
                    {subscription.cancel_at_period_end
                      ? "Cancelado — acesso até " + formatDate(subscription.current_period_end)
                      : formatDate(subscription.current_period_end)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Início do ciclo</span>
                  <span className="font-medium">
                    {formatDate(subscription.current_period_start)}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="mt-6"
                onClick={handleOpenPortal}
                disabled={opening}
              >
                {opening ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Gerenciar assinatura
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Cancele, troque de plano ou atualize cartão pelo portal seguro.
              </p>
            </>
          ) : (
            <>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                Sem assinatura ativa
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Escolha um plano para liberar todos os recursos.
              </p>
              <Button asChild variant="hero" className="mt-5">
                <Link to="/#pricing">Ver planos</Link>
              </Button>
            </>
          )}
        </section>

        {/* WhatsApp */}
        <WhatsappSettingsCard />

        {/* Automação de aniversários */}
        <BirthdayAutomationCard />
      </div>
    </>
  );
};

export default Configuracoes;
