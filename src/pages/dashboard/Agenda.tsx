import { useEffect, useState, useCallback } from "react";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useProfessionals, usePatients } from "@/hooks/useClinicData";
import { useAuth } from "@/hooks/useAuth";
import { useWhatsappSettings } from "@/hooks/useWhatsappSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

type Status = "scheduled" | "confirmed" | "completed" | "no_show" | "canceled";

interface Appointment {
  id: string;
  patient_id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  status: Status;
  price: number | null;
  notes: string | null;
  confirmation_sent_at: string | null;
  confirmation_channel: "manual" | "api" | null;
  patient: { name: string; phone: string | null } | null;
  professional: { name: string; color: string | null } | null;
}

const statusLabels: Record<Status, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  completed: "Realizada",
  no_show: "Faltou",
  canceled: "Cancelada",
};

const statusColors: Record<Status, string> = {
  scheduled: "bg-muted text-muted-foreground",
  confirmed: "bg-success/15 text-success",
  completed: "bg-primary/15 text-primary",
  no_show: "bg-destructive/15 text-destructive",
  canceled: "bg-warning/15 text-warning",
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const Agenda = () => {
  const { user } = useAuth();
  const { data: professionals } = useProfessionals();
  const { data: patients } = usePatients();
  const { settings: whatsappSettings } = useWhatsappSettings();
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Appointment | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [fallbackPrompt, setFallbackPrompt] = useState<Appointment | null>(null);

  const sendConfirmation = async (
    a: Appointment,
    forcedChannel?: "manual" | "api",
  ) => {
    setConfirmingId(a.id);
    try {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-send-confirmation",
        {
          body: {
            appointment_id: a.id,
            template: "confirmation",
            ...(forcedChannel ? { channel: forcedChannel } : {}),
          },
        },
      );
      if (error) throw new Error(error.message);
      const res = data as {
        ok?: boolean;
        error?: string;
        mode?: "manual" | "api";
        url?: string;
      };
      if (res?.error) throw new Error(res.error);
      if (res?.mode === "manual" && res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer");
        toast.success("WhatsApp aberto com a mensagem pronta");
      } else if (res?.mode === "api") {
        toast.success("Confirmação enviada via WhatsApp");
      }
      setItems((prev) =>
        prev.map((it) =>
          it.id === a.id
            ? {
                ...it,
                confirmation_sent_at: new Date().toISOString(),
                confirmation_channel: res?.mode ?? it.confirmation_channel,
              }
            : it,
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar confirmação");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleConfirmWhatsapp = async (a: Appointment) => {
    if (!a.patient?.phone) {
      toast.error("Paciente sem telefone cadastrado");
      return;
    }
    // When API is selected but not verified, ask whether to fall back to manual
    if (
      whatsappSettings?.mode === "api" &&
      whatsappSettings.verification_status !== "valid"
    ) {
      setFallbackPrompt(a);
      return;
    }
    await sendConfirmation(a);
  };

  const [form, setForm] = useState({
    patient_id: "",
    professional_id: "",
    date: todayISO(),
    start_time: "09:00",
    duration: 30,
    status: "scheduled" as Status,
    price: "",
    notes: "",
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;
    const { data } = await supabase
      .from("appointments")
      .select(
        "id, patient_id, professional_id, starts_at, ends_at, status, price, notes, confirmation_sent_at, confirmation_channel, patient:patients(name, phone), professional:professionals(name, color)"
      )
      .gte("starts_at", start)
      .lte("starts_at", end)
      .order("starts_at");
    setItems((data as Appointment[]) ?? []);
    setLoading(false);
  }, [user, date]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1" && professionals.length && patients.length) {
      openNew();
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, professionals, patients]);
  const shiftDay = (delta: number) => {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  const openNew = () => {
    if (professionals.length === 0 || patients.length === 0) {
      toast.error("Cadastre ao menos 1 profissional e 1 paciente primeiro");
      return;
    }
    setEditing(null);
    setForm({
      patient_id: patients[0]?.id ?? "",
      professional_id: professionals.find((p) => p.active)?.id ?? professionals[0].id,
      date,
      start_time: "09:00",
      duration: 30,
      status: "scheduled",
      price: "",
      notes: "",
    });
    setOpen(true);
  };

  const openEdit = (a: Appointment) => {
    const start = new Date(a.starts_at);
    const end = new Date(a.ends_at);
    const dur = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
    setEditing(a);
    setForm({
      patient_id: a.patient_id,
      professional_id: a.professional_id,
      date: start.toISOString().slice(0, 10),
      start_time: start.toTimeString().slice(0, 5),
      duration: dur,
      status: a.status,
      price: a.price?.toString() ?? "",
      notes: a.notes ?? "",
    });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.patient_id || !form.professional_id) {
      toast.error("Selecione paciente e profissional");
      return;
    }
    setSaving(true);
    const startsAt = new Date(`${form.date}T${form.start_time}:00`);
    const endsAt = new Date(startsAt.getTime() + form.duration * 60000);
    const payload = {
      user_id: user.id,
      patient_id: form.patient_id,
      professional_id: form.professional_id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: form.status,
      price: form.price ? Number(form.price) : null,
      notes: form.notes.trim() || null,
    };
    const { error, data } = editing
      ? await supabase
          .from("appointments")
          .update(payload)
          .eq("id", editing.id)
          .select()
          .single()
      : await supabase.from("appointments").insert(payload).select().single();

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }

    // Auto-criar transação de receita quando consulta marcada como realizada
    if (
      form.status === "completed" &&
      form.price &&
      Number(form.price) > 0 &&
      data
    ) {
      const apptId = (data as { id: string }).id;
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("appointment_id", apptId)
        .maybeSingle();
      if (!existing) {
        await supabase.from("transactions").insert({
          user_id: user.id,
          appointment_id: apptId,
          type: "income",
          category: "Consulta",
          description: `Consulta realizada`,
          amount: Number(form.price),
          occurred_on: form.date,
        });
      }
    }

    toast.success(editing ? "Consulta atualizada" : "Consulta agendada");
    setOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", confirmDelete.id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
    } else {
      toast.success("Consulta removida");
      load();
    }
    setConfirmDelete(null);
  };

  const fmtDateLabel = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });

  return (
    <>
      <DashboardTopbar
        title="Agenda"
        subtitle="Gerencie consultas e horários"
        action={{ label: "Nova consulta", onClick: openNew }}
      />

      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
          <Button variant="outline" size="icon" onClick={() => shiftDay(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDate(todayISO())}>
            Hoje
          </Button>
          <span className="ml-2 text-sm font-medium capitalize text-muted-foreground">
            {fmtDateLabel(date)} · {items.length} consulta(s)
          </span>
        </div>

        {whatsappSettings?.mode === "api" &&
          whatsappSettings.verification_status !== "valid" && (
            <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  WhatsApp em modo API sem credenciais verificadas
                </p>
                <p className="text-muted-foreground">
                  {whatsappSettings.verification_status === "invalid"
                    ? "As credenciais Meta estão inválidas."
                    : "As credenciais Meta ainda não foram verificadas."}{" "}
                  O envio via API está bloqueado até a verificação ser concluída.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard/configuracoes">Verificar agora</Link>
              </Button>
            </div>
          )}

        {professionals.length === 0 || patients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Para começar, cadastre{" "}
              {professionals.length === 0 && (
                <Link to="/dashboard/profissionais" className="underline">
                  profissionais
                </Link>
              )}
              {professionals.length === 0 && patients.length === 0 && " e "}
              {patients.length === 0 && (
                <Link to="/dashboard/pacientes" className="underline">
                  pacientes
                </Link>
              )}
              .
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold">Sem consultas neste dia</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione uma consulta para começar.
            </p>
            <Button variant="hero" className="mt-6" onClick={openNew}>
              <Plus className="h-4 w-4" /> Nova consulta
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <ul className="divide-y divide-border">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-4 p-4 transition-smooth hover:bg-secondary/40"
                >
                  <div className="text-center">
                    <p className="font-display text-lg font-bold">
                      {fmtTime(a.starts_at)}
                    </p>
                    <p className="text-[10px] uppercase text-muted-foreground">
                      até {fmtTime(a.ends_at)}
                    </p>
                  </div>
                  <div
                    className="h-12 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: a.professional?.color ?? "#3B82F6" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {a.patient?.name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.professional?.name ?? "—"}
                      {a.notes && ` · ${a.notes}`}
                    </p>
                  </div>
                  {a.price != null && (
                    <span className="text-sm font-semibold text-success">
                      R$ {Number(a.price).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[a.status]}`}
                  >
                    {statusLabels[a.status]}
                  </span>
                  <div className="flex items-center gap-1">
                    {a.confirmation_sent_at ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-success hover:text-success"
                        onClick={() => handleConfirmWhatsapp(a)}
                        disabled={confirmingId === a.id}
                        title={`Confirmação enviada em ${new Date(a.confirmation_sent_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}${a.confirmation_channel ? ` (${a.confirmation_channel === "api" ? "API" : "manual"})` : ""}`}
                      >
                        {confirmingId === a.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline text-xs">Reenviar</span>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => handleConfirmWhatsapp(a)}
                        disabled={confirmingId === a.id || !a.patient?.phone}
                        title={
                          a.patient?.phone
                            ? "Confirmar via WhatsApp"
                            : "Paciente sem telefone"
                        }
                      >
                        {confirmingId === a.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-success" />
                        ) : (
                          <MessageCircle className="h-3.5 w-3.5 text-success" />
                        )}
                        <span className="hidden sm:inline text-xs">Confirmar</span>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(a)}
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar consulta" : "Nova consulta"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do agendamento.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Paciente *</Label>
                <Select
                  value={form.patient_id}
                  onValueChange={(v) => setForm({ ...form, patient_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissional *</Label>
                <Select
                  value={form.professional_id}
                  onValueChange={(v) => setForm({ ...form, professional_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals
                      .filter((p) => p.active || p.id === form.professional_id)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ap-date">Data</Label>
                <Input
                  id="ap-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap-time">Hora</Label>
                <Input
                  id="ap-time"
                  type="time"
                  required
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap-dur">Duração (min)</Label>
                <Input
                  id="ap-dur"
                  type="number"
                  min={15}
                  step={15}
                  max={480}
                  required
                  value={form.duration}
                  onChange={(e) =>
                    setForm({ ...form, duration: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as Status })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(statusLabels) as Status[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabels[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ap-price">Valor (R$)</Label>
                <Input
                  id="ap-price"
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ap-notes">Observações</Label>
              <Textarea
                id="ap-notes"
                rows={2}
                maxLength={1000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Procedimento, observações…"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Marcando como <strong>Realizada</strong> com valor preenchido, criamos
              automaticamente um lançamento de receita no Financeiro.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="hero" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Salvar" : "Agendar"}
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
            <AlertDialogTitle>Remover consulta?</AlertDialogTitle>
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

      <AlertDialog
        open={!!fallbackPrompt}
        onOpenChange={(o) => !o && setFallbackPrompt(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar como manual?</AlertDialogTitle>
            <AlertDialogDescription>
              {whatsappSettings?.verification_status === "invalid"
                ? "Suas credenciais Meta estão inválidas, então o envio via API não pode ser feito agora."
                : "Suas credenciais Meta ainda não foram verificadas, então o envio via API não pode ser feito agora."}{" "}
              Deseja enviar esta confirmação pelo modo manual (abrir o WhatsApp Web/App
              com a mensagem pronta) só desta vez?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-between">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  setFallbackPrompt(null);
                  navigate("/dashboard/configuracoes#whatsapp");
                }}
              >
                Verificar credenciais
              </Button>
              <AlertDialogAction
                onClick={async () => {
                  const a = fallbackPrompt;
                  setFallbackPrompt(null);
                  if (a) await sendConfirmation(a, "manual");
                }}
              >
                Enviar como manual
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Agenda;
