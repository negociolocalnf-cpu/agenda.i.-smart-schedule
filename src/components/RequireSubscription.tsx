import { Link, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";

/**
 * Gate that blocks dashboard pages when the user has no active subscription.
 * Configurações stays accessible (so users can subscribe / manage billing).
 */
export function RequireSubscription({ children }: { children: React.ReactNode }) {
  const { isActive, loading } = useSubscription();
  const location = useLocation();

  // Always allow Configurações
  if (location.pathname.startsWith("/dashboard/configuracoes")) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elegant">
            <Lock className="h-7 w-7" />
          </div>
          <h2 className="font-display text-xl font-bold">Assinatura necessária</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Para usar este recurso você precisa de um plano ativo. Escolha o plano
            ideal e libere todas as funcionalidades da plataforma.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="hero" asChild>
              <Link to="/#pricing">Ver planos</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard/configuracoes">Minha conta</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
