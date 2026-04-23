import { useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const CheckoutReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) return;
    const timer = setTimeout(() => navigate("/dashboard"), 4000);
    return () => clearTimeout(timer);
  }, [sessionId, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-10 text-center shadow-elevated">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="font-display text-2xl font-bold">
          {sessionId ? "Pagamento confirmado!" : "Sessão não encontrada"}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {sessionId
            ? "Sua assinatura está ativa. Você será redirecionado ao painel em instantes."
            : "Não conseguimos encontrar dados do seu pagamento."}
        </p>
        <Button asChild variant="hero" size="lg" className="mt-6 w-full">
          <Link to="/dashboard">Ir para o painel</Link>
        </Button>
      </div>
    </main>
  );
};

export default CheckoutReturn;
