import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const CTA = () => {
  return (
    <section className="container py-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-10 text-center shadow-glow md:p-16">
        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />

        <h2 className="font-display text-3xl font-extrabold text-primary-foreground md:text-5xl">
          Pronto para encher sua agenda?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/85">
          Junte-se a centenas de clínicas que já automatizaram seu agendamento.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="accent" size="xl" asChild>
            <Link to="/dashboard">
              Assinar agora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
