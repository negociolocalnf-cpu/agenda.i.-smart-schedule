import { useEffect, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { Calendar, Users, Wallet, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface NextAppt {
  id: string;
  starts_at: string;
  patient: { name: string; phone: string | null } | null;
  professional: { name: string } | null;
}

const todayRange = () => {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
  return { start, end };
};

const monthRange = () => {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { start, end };
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    monthRevenue: 0,
    patients: 0,
    noShowRate: 0,
  });
  const [nextAppts, setNextAppts] = useState<NextAppt[]>([]);
  const [chart, setChart] = useState<{ day: string; receita: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { start: tStart, end: tEnd } = todayRange();
      const { start: mStart, end: mEnd } = monthRange();

      const [todayCount, patientsCount, monthTx, monthAppts, upcoming] = await Promise.all([
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .gte("starts_at", tStart)
          .lt("starts_at", tEnd),
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase
          .from("transactions")
          .select("amount, type, occurred_on")
          .gte("occurred_on", mStart)
          .lte("occurred_on", mEnd),
        supabase
          .from("appointments")
          .select("status, starts_at")
          .gte("starts_at", `${mStart}T00:00:00`)
          .lte("starts_at", `${mEnd}T23:59:59`),
        supabase
          .from("appointments")
          .select(
            "id, starts_at, patient:patients(name, phone), professional:professionals(name)"
          )
          .gte("starts_at", new Date().toISOString())
          .order("starts_at")
          .limit(5),
      ]);

      const revenue = (monthTx.data ?? [])
        .filter((t: { type: string }) => t.type === "income")
        .reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);

      const totalAppts = monthAppts.data?.length ?? 0;
      const noShows =
        monthAppts.data?.filter((a: { status: string }) => a.status === "no_show")
          .length ?? 0;
      const noShowRate = totalAppts > 0 ? (noShows / totalAppts) * 100 : 0;

      // Build daily revenue for current month
      const map = new Map<string, number>();
      (monthTx.data ?? []).forEach((t: { type: string; amount: number; occurred_on: string }) => {
        if (t.type !== "income") return;
        map.set(t.occurred_on, (map.get(t.occurred_on) ?? 0) + Number(t.amount));
      });
      const daily = Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, receita]) => ({
          day: new Date(day + "T12:00:00").toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
          receita,
        }));

      setStats({
        today: todayCount.count ?? 0,
        monthRevenue: revenue,
        patients: patientsCount.count ?? 0,
        noShowRate,
      });
      setChart(daily);
      setNextAppts((upcoming.data as NextAppt[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const initials = (n: string) =>
    n.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <>
      <DashboardTopbar
        title="Visão geral"
        subtitle="Resumo da sua clínica"
      />

      <div className="space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Consultas hoje"
            value={loading ? "…" : String(stats.today)}
            icon={Calendar}
            accent="primary"
          />
          <StatCard
            label="Receita do mês"
            value={loading ? "…" : fmt(stats.monthRevenue)}
            icon={Wallet}
            accent="success"
          />
          <StatCard
            label="Pacientes cadastrados"
            value={loading ? "…" : String(stats.patients)}
            icon={Users}
            accent="accent"
          />
          <StatCard
            label="Taxa de faltas"
            value={loading ? "…" : `${stats.noShowRate.toFixed(1)}%`}
            icon={AlertTriangle}
            accent="warning"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft lg:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-base font-bold">Receita do mês</h3>
                <p className="text-xs text-muted-foreground">Lançamentos diários</p>
              </div>
              <p className="font-display text-2xl font-extrabold">
                {fmt(stats.monthRevenue)}
              </p>
            </div>
            <div className="mt-6 h-64">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : chart.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sem receitas neste mês.{" "}
                  <Link
                    to="/dashboard/financeiro"
                    className="ml-1 underline"
                  >
                    Adicionar
                  </Link>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chart}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="hsl(var(--primary))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      formatter={(v: number) => [fmt(v), "Receita"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      fill="url(#rev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold">Próximas consultas</h3>
                <p className="text-xs text-muted-foreground">5 mais próximas</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard/agenda">Ver tudo</Link>
              </Button>
            </div>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : nextAppts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma consulta futura.
              </p>
            ) : (
              <ul className="space-y-3">
                {nextAppts.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-smooth hover:border-border hover:bg-secondary/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                      {a.patient ? initials(a.patient.name) : "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {a.patient?.name ?? "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {new Date(a.starts_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {a.professional?.name ?? "—"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
