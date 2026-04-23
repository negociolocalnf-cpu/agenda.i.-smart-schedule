import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Básico",
    price: "97",
    desc: "Para profissionais autônomos começando.",
    features: [
      "1 profissional",
      "Até 100 agendamentos/mês",
      "Lembretes por e-mail",
      "Portal do paciente",
    ],
    cta: "Assinar Básico",
    highlighted: false,
  },
  {
    name: "Profissional",
    price: "197",
    desc: "Para clínicas em crescimento.",
    features: [
      "Até 5 profissionais",
      "Agendamentos ilimitados",
      "WhatsApp + e-mail",
      "Financeiro completo",
      "Prontuário digital",
    ],
    cta: "Assinar Profissional",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "297",
    desc: "Para redes e multi-unidades.",
    features: [
      "Profissionais ilimitados",
      "Multi-clínicas",
      "Relatórios avançados",
      "API e integrações",
      "Suporte prioritário",
    ],
    cta: "Falar com vendas",
    highlighted: false,
  },
];

export const Pricing = () => {
  return (
    <section id="pricing" className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">
          Planos
        </span>
        <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">
          Preços que crescem com você
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Ativação imediata. Cancele quando quiser.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={cn(
              "relative rounded-3xl border bg-card p-8 transition-spring",
              p.highlighted
                ? "border-primary shadow-glow scale-[1.02]"
                : "border-border shadow-soft hover:shadow-elevated"
            )}
          >
            {p.highlighted && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-accent-glow">
                MAIS POPULAR
              </span>
            )}
            <h3 className="font-display text-xl font-bold">{p.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-sm font-semibold text-muted-foreground">R$</span>
              <span className="font-display text-5xl font-extrabold">{p.price}</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            <Button
              variant={p.highlighted ? "hero" : "outline"}
              size="lg"
              className="mt-6 w-full"
              asChild
            >
              <Link to="/dashboard">{p.cta}</Link>
            </Button>
            <ul className="mt-7 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};
