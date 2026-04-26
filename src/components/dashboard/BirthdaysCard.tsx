import { useMemo } from "react";
import { Cake, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePatients } from "@/hooks/useClinicData";

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const monthLabel = () =>
  new Date().toLocaleDateString("pt-BR", { month: "long" });

interface BirthdayPatient {
  id: string;
  name: string;
  phone: string | null;
  day: number;
  isToday: boolean;
}

export function BirthdaysCard() {
  const { data, loading } = usePatients();

  const birthdays = useMemo<BirthdayPatient[]>(() => {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed
    const today = now.getDate();
    return data
      .filter((p) => p.birth_date)
      .map((p) => {
        // birth_date is YYYY-MM-DD; parse without timezone shifting
        const [, m, d] = (p.birth_date as string).split("-").map(Number);
        return {
          id: p.id,
          name: p.name,
          phone: p.phone,
          day: d,
          monthIdx: m - 1,
        };
      })
      .filter((b) => b.monthIdx === month)
      .sort((a, b) => a.day - b.day)
      .map((b) => ({
        id: b.id,
        name: b.name,
        phone: b.phone,
        day: b.day,
        isToday: b.day === today,
      }));
  }, [data]);

  if (loading) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-display text-base font-bold">
            <Cake className="h-4 w-4 text-accent" />
            Aniversariantes de {monthLabel()}
          </h3>
          <p className="text-xs text-muted-foreground">
            {birthdays.length === 0
              ? "Nenhum paciente faz aniversário neste mês."
              : `${birthdays.length} paciente(s) — envie uma mensagem!`}
          </p>
        </div>
      </div>

      {birthdays.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {birthdays.map((b) => (
            <li
              key={b.id}
              className="flex items-center gap-3 py-2.5"
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  b.isToday
                    ? "bg-accent text-accent-foreground"
                    : "bg-accent-soft text-accent"
                }`}
                title={b.isToday ? "Hoje!" : `Dia ${b.day}`}
              >
                {String(b.day).padStart(2, "0")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {b.name}
                  {b.isToday && (
                    <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase text-accent">
                      Hoje
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {b.phone ?? "Sem telefone cadastrado"}
                </p>
              </div>
              {b.phone && (
                <div className="flex items-center gap-1">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Enviar WhatsApp de parabéns"
                  >
                    <a
                      href={`https://wa.me/${onlyDigits(b.phone)}?text=${encodeURIComponent(
                        `Olá ${b.name.split(" ")[0]}! 🎉 Toda a equipe deseja a você um feliz aniversário!`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4 text-success" />
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Ligar"
                  >
                    <a href={`tel:${onlyDigits(b.phone)}`}>
                      <Phone className="h-4 w-4 text-primary" />
                    </a>
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
