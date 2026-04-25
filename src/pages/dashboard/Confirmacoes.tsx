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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useWhatsappSettings } from "@/hooks/useWhatsappSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, MessageCircle, CheckCircle2, XCircle, Search, Mail, Phone, User, Calendar as CalendarIcon } from "lucide-react";

type Channel = "manual" | "api" | null;

interface Row {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  confirmation_sent_at: string | null;
  confirmation_channel: Channel;
  patient: { id: string; name: string; phone: string | null; email: string | null } | null;
  professional: { id: string; name: string; specialty: string | null } | null;
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
  const { settings } = useWhatsappSettings();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayISO());
  const [channelFilter, setChannelFilter] = useState<"all" | "manual" | "api" | "none">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const fromIso = new Date(`${from}T00:00:00`).toISOString();
      const toIso = new Date(`${to}T23:59:59`).toISOString();
      const { data, error } = await supabase
        .from("appointments")
        .select(
          "id, starts_at, ends_at, status, notes, confirmation_sent_at, confirmation_channel, patient:patients(id, name, phone, email), professional:professionals(id, name, specialty)"
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

  const renderTemplate = (row: Row): string => {
    const tpl = settings?.confirmation_template ?? "";
    if (!tpl) return "Configure o template em Configurações › WhatsApp.";
    const date = new Date(row.starts_at);
    const data = date.toLocaleDateString("pt-BR");
    const hora = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return tpl
      .replace(/\{paciente\}/g, row.patient?.name ?? "")
      .replace(/\{profissional\}/g, row.professional?.name ?? "")
      .replace(/\{data\}/g, data)
      .replace(/\{hora\}/g, hora)
      .replace(/\{clinica\}/g, settings?.clinic_name ?? "");
  };

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
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => setSelected(r)}
                    >
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

      {/* Modal de detalhes */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Detalhes da confirmação
            </DialogTitle>
            <DialogDescription>
              Informações da consulta e da mensagem enviada ao paciente.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-5">
              {/* Status / canal */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge sent={!!selected.confirmation_sent_at} />
                <ChannelBadge channel={selected.confirmation_channel} />
                {selected.confirmation_sent_at && (
                  <span className="text-xs text-muted-foreground">
                    Enviada em {fmtDateTime(selected.confirmation_sent_at)}
                  </span>
                )}
              </div>

              {/* Consulta */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Consulta
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{fmtDateTime(selected.starts_at)}</span>
                  <span className="text-muted-foreground">
                    – {fmtDateTime(selected.ends_at).split(" ")[1] ?? ""}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selected.professional?.name ?? "—"}
                    {selected.professional?.specialty && (
                      <span className="text-muted-foreground">
                        {" "}· {selected.professional.specialty}
                      </span>
                    )}
                  </span>
                </div>
                {selected.notes && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {selected.notes}
                  </div>
                )}
              </div>

              {/* Paciente */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Paciente
                </div>
                <div className="text-sm font-medium">{selected.patient?.name ?? "—"}</div>
                <div className="mt-1 grid gap-1 text-sm text-muted-foreground">
                  {selected.patient?.phone && (
                    <a
                      href={`tel:${selected.patient.phone}`}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      <Phone className="h-4 w-4" /> {selected.patient.phone}
                    </a>
                  )}
                  {selected.patient?.email && (
                    <a
                      href={`mailto:${selected.patient.email}`}
                      className="flex items-center gap-2 hover:text-foreground"
                    >
                      <Mail className="h-4 w-4" /> {selected.patient.email}
                    </a>
                  )}
                </div>
              </div>

              {/* Mensagem */}
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Mensagem {selected.confirmation_sent_at ? "enviada" : "(prévia do template)"}
                </div>
                <div className="whitespace-pre-wrap rounded-lg border bg-card p-3 text-sm">
                  {renderTemplate(selected)}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {selected?.patient?.phone && (
              <Button asChild variant="outline">
                <a
                  href={`https://wa.me/${selected.patient.phone.replace(/\D/g, "")}?text=${encodeURIComponent(renderTemplate(selected))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
                </a>
              </Button>
            )}
            <Button onClick={() => setSelected(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Confirmacoes;
