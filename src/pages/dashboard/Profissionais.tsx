import { useState } from "react";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useProfessionals, type Professional } from "@/hooks/useClinicData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Stethoscope, Loader2 } from "lucide-react";

const empty = {
  name: "",
  specialty: "",
  email: "",
  phone: "",
  color: "#3B82F6",
  active: true,
};

const Profissionais = () => {
  const { user } = useAuth();
  const { data, loading, refetch } = useProfessionals();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Professional | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p: Professional) => {
    setEditing(p);
    setForm({
      name: p.name,
      specialty: p.specialty ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      color: p.color ?? "#3B82F6",
      active: p.active,
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
      specialty: form.specialty.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      color: form.color,
      active: form.active,
    };
    const { error } = editing
      ? await supabase.from("professionals").update(payload).eq("id", editing.id)
      : await supabase.from("professionals").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(editing ? "Profissional atualizado" : "Profissional cadastrado");
    setOpen(false);
    refetch();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from("professionals")
      .delete()
      .eq("id", confirmDelete.id);
    if (error) {
      toast.error(
        error.message.includes("foreign key")
          ? "Não é possível remover: existem consultas vinculadas"
          : "Erro ao remover: " + error.message
      );
    } else {
      toast.success("Profissional removido");
      refetch();
    }
    setConfirmDelete(null);
  };

  return (
    <>
      <DashboardTopbar
        title="Profissionais"
        subtitle="Equipe clínica e especialidades"
        action={{ label: "Novo profissional", onClick: openNew }}
      />

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Stethoscope className="h-6 w-6" />
            </div>
            <h3 className="font-display text-lg font-bold">Nenhum profissional ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre os profissionais da sua clínica para começar a agendar consultas.
            </p>
            <Button variant="hero" className="mt-6" onClick={openNew}>
              <Plus className="h-4 w-4" /> Cadastrar primeiro profissional
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.map((p) => (
              <article
                key={p.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-smooth hover:shadow-elevated"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
                    style={{ backgroundColor: p.color ?? "#3B82F6" }}
                  >
                    {p.name
                      .split(" ")
                      .map((s) => s[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{p.name}</h3>
                    {p.specialty && (
                      <p className="truncate text-xs text-muted-foreground">
                        {p.specialty}
                      </p>
                    )}
                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        p.active
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
                {(p.email || p.phone) && (
                  <div className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                    {p.email && <p className="truncate">{p.email}</p>}
                    {p.phone && <p>{p.phone}</p>}
                  </div>
                )}
                <div className="mt-4 flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmDelete(p)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar profissional" : "Novo profissional"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do profissional.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prof-name">Nome *</Label>
              <Input
                id="prof-name"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prof-spec">Especialidade</Label>
              <Input
                id="prof-spec"
                maxLength={120}
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                placeholder="Ex: Dentista, Clínico geral"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prof-email">E-mail</Label>
                <Input
                  id="prof-email"
                  type="email"
                  maxLength={255}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prof-phone">Telefone</Label>
                <Input
                  id="prof-phone"
                  maxLength={30}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="11999990000"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="prof-color">Cor</Label>
              <input
                id="prof-color"
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-9 w-14 cursor-pointer rounded border border-border"
              />
              <div className="ml-auto flex items-center gap-2">
                <Label htmlFor="prof-active" className="text-sm">
                  Ativo
                </Label>
                <Switch
                  id="prof-active"
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
              </div>
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
            <AlertDialogTitle>Remover profissional?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.name} será removido permanentemente. Não é possível
              remover se houver consultas vinculadas.
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

export default Profissionais;
