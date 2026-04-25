import { useEffect, useMemo, useState } from "react";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MessageCircle, CheckCircle2, XCircle, Search } from "lucide-react";

type Channel = "manual" | "api" | null;

interface Row {
  id: string;
  starts_at: string;
  status: string;
  confirmation_sent_at: string | null;
  confirmation_channel: Channel;
  patient: { id: string; name: string; phone: string | null } | null;
  professional: { id: string; name: string } | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const Confirmacoes = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayISO());
  const [channelFilter, setChannelFilter] = useState<"all" | "manual" | "api" | "none">("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const fromIso = new Date(`${from}T00:00:00`).toISOString();
      const toIso = new Date(`${to}T23:59:59`).toISOString();
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, starts_at, status, confirmation_sent_at, confirmation_channel, patient:patients(id, name, phone), professional:professionals(id, name)"
        )
        .eq("user_id", user.id)
        .gte("starts_at", fromIso)
        .lte("starts_at", toIso)
        .order("starts_at", { ascending: false });

      if (error) throw error;
      setRows((data ?? []) as unknown as Row[]);
    } catch (e) {
      toast.error("Erro ao carregar histórico", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, from, to]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (channelFilter === "manual" && r.confirmation_channel !== "manual") return false;
      if (channelFilter === "api" && r.confirmation_channel !== "api") return false;
      if (channelFilter === "none" && r.confirmation_sent_at) return false;
      if (search) {
        const q = search.toLowerCase();
        const hit =
          r.patient?.name?.toLowerCase().includes(q) ||
          r.professional?.name?.toLowerCase().includes(q) ||
          r.patient?.phone?.includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [rows, channelFilter, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const sent = rows.filter((r) => r.confirmation_sent_at).length;
    const manual = rows.filter((r) => r.confirmation_channel === "manual").length;
    const api = rows.filter((r) => r.confirmation_channel === "api").length;
    const pending = total - sent;
    return { total, sent, manual, api, pending };
  }, [rows]);

  // Por paciente: agrupa
  const byPatient = useMemo(() => {
    const map = new Map<
      string,
      {
        patientId: string;
        name: string;
        phone: string | null;
        total: number;
        sent: number;
        lastSent: string | null;
        lastChannel: Channel;
      }
    >();
    for (const r of filtered) {
      if (!r.patient) continue;
      const cur = map.get(r.patient.id) ?? {
        patientId: r.patient.id,
        name: r.patient.name,
        phone: r.patient.phone,
        total: 0,
        sent: 0,
        lastSent: null,
        lastChannel: null,
      };
      cur.total += 1;
      if (r.confirmation_sent_at) {
        cur.sent += 1;
        if (!cur.lastSent || new Date(r.confirmation_sent_at) > new Date(cur.lastSent)) {
          cur.lastSent = r.confirmation_sent_at;
          cur.lastChannel = r.confirmation_channel;
        }
      }
      map.set(r.patient.id, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.sent - a.sent);
  }, [filtered]);

  const ChannelBadge = ({ channel }: { channel: Channel }) => {
    if (!channel) return <Badge variant="outline">—</Badge>;
    if (channel === "manual")
      return (
        <Badge variant="secondary" className="gap-1">
          <MessageCircle className="h-3 w-3" /> Manual
        </Badge>
      );
    return (
      <Badge className="gap-1 bg-primary text-primary-foreground">
        <MessageCircle className="h-3 w-3" /> API
      </Badge>
    );
  };

  const StatusBadge = ({ sent }: { sent: boolean }) =>
    sent ? (
      <Badge className="gap-1 bg-accent/15 text-accent hover:bg-accent/20">
        <CheckCircle2 className="h-3 w-3" /> Enviada
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <XCircle className="h-3 w-3" /> Pendente
      </Badge>
    );

  return (
    <div className="flex flex-col gap-6">
      <DashboardTopbar
        title="Confirmações WhatsApp"
        subtitle="Histórico de confirmações enviadas por consulta e por paciente."
      />

      {/* Filtros */}
      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="from">De</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">Até</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Canal</Label>
          <Select value={channelFilter} onValueChange={(v: typeof channelFilter) => setChannelFilter(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="api">API (Meta)</SelectItem>
              <SelectItem value="none">Não enviadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="search">Buscar</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              className="pl-8"
              placeholder="Paciente, profissional ou telefone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Consultas no período", value: stats.total },
          { label: "Confirmações enviadas", value: stats.sent },
          { label: "Pendentes", value: stats.pending },
          { label: "Via Manual", value: stats.manual },
          { label: "Via API", value: stats.api },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border bg-card p-4">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-2xl font-semibold">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <Tabs defaultValue="consultas" className="w-full">
        <TabsList>
          <TabsTrigger value="consultas">Por consulta</TabsTrigger>
          <TabsTrigger value="pacientes">Por paciente</TabsTrigger>
        </TabsList>

        <TabsContent value="consultas" className="mt-4">
          <div className="rounded-xl border bg-card">
            {loading ? (
              <div className="flex items-center justify-center p-12 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Nenhuma consulta encontrada para os filtros selecionados.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data da consulta</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Enviada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{fmtDateTime(r.starts_at)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{r.patient?.name ?? "—"}</div>
                        {r.patient?.phone && (
                          <div className="text-xs text-muted-foreground">{r.patient.phone}</div>
                        )}
                      </TableCell>
                      <TableCell>{r.professional?.name ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge sent={!!r.confirmation_sent_at} />
                      </TableCell>
                      <TableCell>
                        <ChannelBadge channel={r.confirmation_channel} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {fmtDateTime(r.confirmation_sent_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pacientes" className="mt-4">
          <div className="rounded-xl border bg-card">
            {loading ? (
              <div className="flex items-center justify-center p-12 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : byPatient.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                Nenhum paciente encontrado.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Consultas</TableHead>
                    <TableHead>Confirmações</TableHead>
                    <TableHead>Último canal</TableHead>
                    <TableHead>Última enviada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byPatient.map((p) => (
                    <TableRow key={p.patientId}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.phone ?? "—"}</TableCell>
                      <TableCell>{p.total}</TableCell>
                      <TableCell>
                        {p.sent}/{p.total}
                      </TableCell>
                      <TableCell>
                        <ChannelBadge channel={p.lastChannel} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {fmtDateTime(p.lastSent)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Atualizar
        </Button>
      </div>
    </div>
  );
};

export default Confirmacoes;
