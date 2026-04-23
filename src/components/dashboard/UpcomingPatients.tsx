import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const patients = [
  { name: "Ana Carolina Silva", initials: "AC", procedure: "Limpeza", time: "09:00", status: "confirmado", phone: "5511999990001" },
  { name: "Pedro Henrique Costa", initials: "PH", procedure: "Avaliação", time: "10:30", status: "pendente", phone: "5511999990002" },
  { name: "Juliana Mendes", initials: "JM", procedure: "Tratamento canal", time: "11:00", status: "confirmado", phone: "5511999990003" },
  { name: "Roberto Almeida", initials: "RA", procedure: "Retorno", time: "14:00", status: "confirmado", phone: "5511999990004" },
  { name: "Mariana Souza", initials: "MS", procedure: "Avaliação", time: "15:30", status: "pendente", phone: "5511999990005" },
];

export const UpcomingPatients = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold">Próximos pacientes</h3>
          <p className="text-xs text-muted-foreground">Hoje</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <a href="/dashboard/agenda">Ver tudo</a>
        </Button>
      </div>

      <ul className="space-y-3">
        {patients.map((p) => (
          <li
            key={p.name}
            className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-smooth hover:border-border hover:bg-secondary/40"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
              {p.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.time} · {p.procedure}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Enviar mensagem para ${p.name}`}
                asChild
              >
                <a
                  href={`https://wa.me/${p.phone}?text=${encodeURIComponent(`Olá ${p.name.split(" ")[0]}, lembrete da sua consulta às ${p.time}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4 text-success" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`Ligar para ${p.name}`}
                asChild
              >
                <a href={`tel:+${p.phone}`}>
                  <Phone className="h-4 w-4 text-primary" />
                </a>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
