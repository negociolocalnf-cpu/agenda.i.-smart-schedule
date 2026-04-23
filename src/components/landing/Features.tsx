import {
  CalendarRange,
  MessageSquareHeart,
  Users,
  Wallet,
  BarChart3,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: CalendarRange,
    title: "Agenda visual",
    desc: "Visualize por dia, semana ou mês. Drag-and-drop, cores por procedimento e múltiplos profissionais.",
  },
  {
    icon: MessageSquareHeart,
    title: "Lembretes no WhatsApp",
    desc: "Confirmação em 1 clique e reagendamento automático. Reduza no-show em até 70%.",
  },
  {
    icon: Users,
    title: "Gestão de pacientes",
    desc: "Cadastro completo, prontuário simples, histórico de consultas e upload de exames.",
  },
  {
    icon: Wallet,
    title: "Financeiro integrado",
    desc: "Status de pagamento por consulta, relatórios de faturamento e dashboard de receita.",
  },
  {
    icon: BarChart3,
    title: "Dashboard inteligente",
    desc: "Indicadores claros: consultas do dia, taxa de faltas, receita mensal e mais.",
  },
  {
    icon: Globe,
    title: "Portal do paciente",
    desc: "Link público de agendamento. O paciente escolhe profissional, data e horário em segundos.",
  },
];

export const Features = () => {
  return (
    <section id="features" className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">
          Recursos
        </span>
        <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">
          Tudo que sua clínica precisa em um só lugar
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Construído para clínicas odontológicas e médicas que querem crescer sem perder o controle.
        </p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-soft transition-spring hover:-translate-y-1 hover:shadow-elevated"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary-soft/0 to-primary-soft/0 opacity-0 transition-smooth group-hover:from-primary-soft/40 group-hover:to-transparent group-hover:opacity-100" />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <f.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-5 font-display text-xl font-bold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
