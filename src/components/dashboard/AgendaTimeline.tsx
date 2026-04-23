import { cn } from "@/lib/utils";

export type Appointment = {
  id: string;
  time: string;
  duration: number; // in 30-min slots
  patient: string;
  procedure: string;
  professional: string;
  type: "limpeza" | "avaliacao" | "tratamento" | "retorno" | "urgencia";
  status: "confirmado" | "pendente" | "cancelado";
};

const typeColors: Record<Appointment["type"], string> = {
  limpeza: "bg-primary/10 border-l-primary text-primary",
  avaliacao: "bg-accent/10 border-l-accent text-accent",
  tratamento: "bg-success/10 border-l-success text-success",
  retorno: "bg-warning/10 border-l-warning text-warning-foreground",
  urgencia: "bg-destructive/10 border-l-destructive text-destructive",
};

const typeLabels: Record<Appointment["type"], string> = {
  limpeza: "Limpeza",
  avaliacao: "Avaliação",
  tratamento: "Tratamento",
  retorno: "Retorno",
  urgencia: "Urgência",
};

const slots = Array.from({ length: 20 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${min}`;
});

interface AgendaTimelineProps {
  appointments: Appointment[];
}

export const AgendaTimeline = ({ appointments }: AgendaTimelineProps) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="border-b border-border bg-secondary/50 px-6 py-4">
        <h3 className="font-display text-base font-bold">Agenda do dia</h3>
        <p className="text-xs text-muted-foreground">{appointments.length} consultas agendadas</p>
      </div>
      <div className="max-h-[520px] overflow-y-auto">
        {slots.map((slot) => {
          const apt = appointments.find((a) => a.time === slot);
          return (
            <div
              key={slot}
              className="flex items-stretch border-b border-border/60 last:border-0"
            >
              <div className="w-20 shrink-0 border-r border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground">
                {slot}
              </div>
              <div className="flex-1 p-2">
                {apt ? (
                  <div
                    className={cn(
                      "group cursor-pointer rounded-lg border-l-4 p-3 transition-smooth hover:translate-x-0.5",
                      typeColors[apt.type]
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {apt.patient}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {apt.procedure} · {apt.professional}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                          apt.status === "confirmado" && "bg-success/15 text-success",
                          apt.status === "pendente" && "bg-warning/15 text-warning",
                          apt.status === "cancelado" && "bg-destructive/15 text-destructive"
                        )}
                      >
                        {apt.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] font-semibold">
                        {typeLabels[apt.type]}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {apt.duration * 30} min
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[44px] rounded-lg border border-dashed border-border/60 transition-smooth hover:border-primary/40 hover:bg-primary-soft/30" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
