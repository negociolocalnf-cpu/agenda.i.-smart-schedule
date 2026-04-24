import { useEffect, useState, useCallback, useMemo } from "react";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Pencil,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type Type = "income" | "expense";

interface Transaction {
  id: string;
  type: Type;
  category: string | null;
  description: string | null;
  amount: number;
  occurred_on: string;
  appointment_id: string | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const monthEnd = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Financeiro = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(monthEnd());

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null);

  const [form, setForm] = useState({
    type: "income" as Type,
    category: "",
    description: "",
    amount: "",
    occurred_on: todayISO(),
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .gte("occurred_on", from)
      .lte("occurred_on", to)
      .order("occurred_on", { ascending: false });
    setItems((data as Transaction[]) ?? []);
    setLoading(false);
  }, [user, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const income = items
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount), 0);
    const expense = items
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);
    return { income, expense, balance: income - expense };
  }, [items]);

  const chartData = useMemo(() => {
    // Group by day in range
    const map = new Map<string, { day: string; receita: number; despesa: number }>();
    items.forEach((t) => {
      const key = t.occurred_on;
      const cur = map.get(key) ?? { day: key, receita: 0, despesa: 0 };
      if (t.type === "income") cur.receita += Number(t.amount);
      else cur.despesa += Number(t.amount);
      map.set(key, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((d) => ({
        ...d,
        day: new Date(d.day + "T12:00:00").toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
      }));
  }, [items]);

  const openNew = () => {
    setEditing(null);
    setForm({
      type: "income",
      category: "",
      description: "",
      amount: "",
      occurred_on: todayISO(),
    });
    setOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({
      type: t.type,
      category: t.category ?? "",
      description: t.description ?? "",
      amount: String(t.amount),
      occurred_on: t.occurred_on,
    });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = Number(form.amount);
    if (!amt || amt <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      type: form.type,
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      amount: amt,
      occurred_on: form.occurred_on,
    };
    const { error } = editing
      ? await supabase.from("transactions").update(payload).eq("id", editing.id)
      : await supabase.from("transactions").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(editing ? "Lançamento atualizado" : "Lançamento criado");
    setOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", confirmDelete.id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
    } else {
      toast.success("Lançamento removido");
      load();
    }
    setConfirmDelete(null);
  };

  return (
    <>
      <DashboardTopbar
        title="Financeiro"
        subtitle="Receitas, despesas e fluxo de caixa"
        action={{ label: "Novo lançamento", onClick: openNew }}
      />

      <div className="space-y-6 p-6">
        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom(monthStart());
              setTo(monthEnd());
            }}
          >
            Mês atual
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Receitas</span>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold text-success">
              {fmt(totals.income)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Despesas</span>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold text-destructive">
              {fmt(totals.expense)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saldo</span>
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <p
              className={`mt-2 font-display text-2xl font-extrabold ${
                totals.balance >= 0 ? "text-foreground" : "text-destructive"
              }`}
            >
              {fmt(totals.balance)}
            </p>
          </div>
        </div>

        {/* Gráfico */}
        {chartData.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h3 className="font-display text-base font-bold">Fluxo no período</h3>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
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
                    formatter={(v: number) => fmt(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="receita"
                    name="Receita"
                    fill="hsl(var(--success))"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="despesa"
                    name="Despesa"
                    fill="hsl(var(--destructive))"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold">Sem lançamentos no período</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione receitas e despesas para acompanhar o caixa.
            </p>
            <Button variant="hero" className="mt-6" onClick={openNew}>
              <Plus className="h-4 w-4" /> Novo lançamento
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <ul className="divide-y divide-border">
              {items.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-4 p-4 transition-smooth hover:bg-secondary/40"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      t.type === "income"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {t.type === "income" ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {t.description || t.category || "Lançamento"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.category && `${t.category} · `}
                      {new Date(t.occurred_on + "T12:00:00").toLocaleDateString(
                        "pt-BR"
                      )}
                      {t.appointment_id && " · vinculado a consulta"}
                    </p>
                  </div>
                  <p
                    className={`font-display text-lg font-bold ${
                      t.type === "income" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {t.type === "income" ? "+" : "−"} {fmt(Number(t.amount))}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(t)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
            <DialogDescription>Receita ou despesa do período.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as Type })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tx-date">Data</Label>
                <Input
                  id="tx-date"
                  type="date"
                  required
                  value={form.occurred_on}
                  onChange={(e) =>
                    setForm({ ...form, occurred_on: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-amount">Valor (R$) *</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-cat">Categoria</Label>
              <Input
                id="tx-cat"
                maxLength={60}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Consulta, Aluguel, Material…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-desc">Descrição</Label>
              <Input
                id="tx-desc"
                maxLength={200}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="hero" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Salvar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Financeiro;
