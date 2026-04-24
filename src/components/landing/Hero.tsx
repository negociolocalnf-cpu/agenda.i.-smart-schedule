import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";
import heroImage from "@/assets/hero-clinic-new.jpg";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="container relative grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-4 py-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Agendamento inteligente para clínicas
          </div>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] text-foreground md:text-6xl">
            Reduza faltas e
            <span className="block bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              encha sua agenda.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            O <strong className="text-foreground">Agend.AI</strong> automatiza confirmações via WhatsApp, organiza profissionais
            e dá visibilidade completa da sua clínica — em uma só tela.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button variant="hero" size="xl" asChild>
              <Link to="/dashboard">
                Assinar agora
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <a href="#pricing">Ver planos</a>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> Ativação imediata
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> Cancele quando quiser
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" /> LGPD compliant
            </span>
          </div>
        </div>

        <div className="relative animate-fade-in">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-elevated">
            <img
              src={heroImage}
              alt="Profissional de saúde sorrindo em consultório moderno"
              width={1280}
              height={960}
              className="h-auto w-full"
            />
          </div>

          {/* Floating cards */}
          <div className="absolute -left-4 top-10 hidden animate-float rounded-2xl border border-border bg-card p-4 shadow-elevated md:block">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Confirmação automática</p>
                <p className="text-sm font-semibold">+87% presença</p>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-4 -right-4 hidden animate-float rounded-2xl border border-border bg-card p-4 shadow-elevated md:block" style={{ animationDelay: "1.5s" }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Agenda do dia</p>
                <p className="text-sm font-semibold">24 consultas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
