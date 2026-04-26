import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { usePatients, type Patient } from "@/hooks/useClinicData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  Loader2,
  Search,
  Phone,
  MessageCircle,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { BirthdaysCard } from "@/components/dashboard/BirthdaysCard";

const empty = {
  name: "",
  email: "",
  phone: "",
  birth_date: "",
  notes: "",
};

const onlyDigits = (s: string) => s.replace(/\D/g, "");

const Pacientes = () => {
  const { user } = useAuth();
  const { data, loading, refetch } = usePatients();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Patient | null>(null);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phone?.includes(q)
    );
  }, [data, search]);

  // Open "new patient" dialog when ?new=1 is present (used by P shortcut)
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null);
      setForm(empty);
      setOpen(true);
      searchParams.delete("new");
      setSearchParams(searchParams, { replace: true });
    }
    // Highlight a patient when ?focus=ID is present (from global search)
    const focus = searchParams.get("focus");
    if (focus) {
      setTimeout(() => {
        const el = document.getElementById(`patient-${focus}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary");
          setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2000);
        }
      }, 100);
      searchParams.delete("focus");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p: Patient) => {
    setEditing(p);
    setForm({
      name: p.name,
      email: p.email ?? "",
      phone: p.phone ?? "",
      birth_date: p.birth_date ?? "",
      notes: p.notes ?? "",
    });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      birth_date: form.birth_date || null,
      notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("patients").update(payload).eq("id", editing.id)
      : await supabase.from("patients").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(editing ? "Paciente atualizado" : "Paciente cadastrado");
    setOpen(false);
    refetch();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from("patients")
      .delete()
      .eq("id", confirmDelete.id);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
    } else {
      toast.success("Paciente removido");
      refetch();
    }
    setConfirmDelete(null);
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <>
      <DashboardTopbar
        title="Pacientes"
        subtitle={`${data.length} pacientes cadastrados`}
        action={{ label: "Novo paciente", onClick: openNew }}
      />

      <div className="space-y-6 p-6">
        {data.length > 0 && <BirthdaysCard />}

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum paciente ainda"
            description="Cadastre seus pacientes para agendá-los e acompanhar histórico, contatos e aniversários."
            action={{
              label: "Cadastrar primeiro paciente",
              onClick: openNew,
              icon: Plus,
            }}
          />
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Nenhum paciente encontrado para "{search}".
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <ul className="divide-y divide-border">
              {filtered.map((p) => (
                <li
                  id={`patient-${p.id}`}
                  key={p.id}
                  className="flex flex-wrap items-center gap-4 p-4 transition-smooth hover:bg-secondary/40"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                    {initials(p.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      {p.phone ? <span>{p.phone}</span> : null}
                      {p.email ? <span className="truncate">{p.email}</span> : null}
                      {!p.phone && !p.email && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-warning">
                          <AlertTriangle className="h-3 w-3" /> Sem contato
                        </span>
                      )}
                      {p.phone && !p.email && (
                        <span className="text-[10px] uppercase text-muted-foreground/70">
                          sem e-mail
                        </span>
                      )}
                      {!p.phone && p.email && (
                        <span className="text-[10px] uppercase text-muted-foreground/70">
                          sem telefone
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.phone ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                          title="WhatsApp"
                        >
                          <a
                            href={`https://wa.me/${onlyDigits(p.phone)}`}
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
                          asChild
                          title="Ligar"
                        >
                          <a href={`tel:${onlyDigits(p.phone)}`}>
                            <Phone className="h-4 w-4 text-primary" />
                          </a>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-40"
                          disabled
                          title="Paciente sem telefone — edite para adicionar"
                          onClick={() => toast.warning("Paciente sem telefone cadastrado")}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-40"
                          disabled
                          title="Paciente sem telefone — edite para adicionar"
                          onClick={() => toast.warning("Paciente sem telefone cadastrado")}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {p.email ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                        title="E-mail"
                      >
                        <a href={`mailto:${p.email}`}>
                          <Mail className="h-4 w-4 text-accent" />
                        </a>
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-40"
                        disabled
                        title="Paciente sem e-mail — edite para adicionar"
                        onClick={() => toast.warning("Paciente sem e-mail cadastrado")}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(p)}
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
            <DialogTitle>
              {editing ? "Editar paciente" : "Novo paciente"}
            </DialogTitle>
            <DialogDescription>Preencha os dados do paciente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pat-name">Nome *</Label>
              <Input
                id="pat-name"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="pat-phone">Telefone</Label>
                <Input
                  id="pat-phone"
                  maxLength={30}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="5511999990000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pat-birth">Nascimento</Label>
                <Input
                  id="pat-birth"
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pat-email">E-mail</Label>
              <Input
                id="pat-email"
                type="email"
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pat-notes">Observações</Label>
              <Textarea
                id="pat-notes"
                rows={3}
                maxLength={2000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Alergias, histórico, preferências…"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="hero" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Salvar" : "Cadastrar"}
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
            <AlertDialogTitle>Remover paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.name} e todas as consultas vinculadas serão removidos
              permanentemente.
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

export default Pacientes;
