import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const data = [
  { day: "Seg", receita: 2400, consultas: 12 },
  { day: "Ter", receita: 3200, consultas: 16 },
  { day: "Qua", receita: 2800, consultas: 14 },
  { day: "Qui", receita: 4100, consultas: 21 },
  { day: "Sex", receita: 3800, consultas: 19 },
  { day: "Sáb", receita: 2200, consultas: 11 },
  { day: "Dom", receita: 0, consultas: 0 },
];

export const RevenueChart = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-base font-bold">Receita semanal</h3>
          <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl font-extrabold">R$ 18.500</p>
          <p className="text-xs font-semibold text-success">+12,4% vs semana anterior</p>
        </div>
      </div>

      <div className="mt-6 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
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
              tickFormatter={(v) => `R$${v / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Receita"]}
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
      </div>
    </div>
  );
};
