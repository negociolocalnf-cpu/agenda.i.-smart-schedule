import { useEffect, useState } from "react";
import { Cake, Loader2, PlayCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_TEMPLATE =
  "Olá {paciente}! 🎉 Toda a equipe da {clinica} deseja a você um feliz aniversário! Tenha um dia incrível. 🎂";

interface Settings {
  enabled: boolean;
  send_hour: number;
  template: string;
  last_run_on: string | null;
}

export function BirthdayAutomationCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    enabled: false,
    send_hour: 8,
    template: DEFAULT_TEMPLATE,
    last_run_on: null,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("birthday_automation_settings")
        .select("enabled, send_hour, template, last_run_on")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setSettings({
          enabled: data.enabled,
          send_hour: data.send_hour,
          template: data.template,
          last_run_on: data.last_run_on,
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("birthday_automation_settings")
      .upsert(
        {
          user_id: user.id,
          enabled: settings.enabled,
          send_hour: settings.send_hour,
          template: settings.template.trim() || DEFAULT_TEMPLATE,
        },
        { onConflict: "user_id" },
      );
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar: " + error.message);
      return;
    }
    toast.success("Automação salva!");
  };

  const handleRunNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke(
      "birthday-send-daily",
      { body: { manual: true } },
    );
    setRunning(false);
    if (error) {
      toast.error(error.message || "Falha ao executar agora");
      return;
    }
    const r = data?.result;
    if (!r) {
      toast.error("Resposta inválida da função");
      return;
    }
    if (r.attempted === 0) {
      toast.info("Nenhum aniversariante hoje 🎂");
      return;
    }
    if (r.sent > 0) {
      toast.success(
        `${r.sent} mensagem(ns) enviada(s)${r.failed ? ` — ${r.failed} falha(s)` : ""}`,
      );
    } else if (r.failed > 0) {
      toast.error(
        `Falhou em ${r.failed} envio(s). ${r.errors?.[0] ?? ""}`,
      );
    } else {
      toast.info("Tudo já havia sido enviado hoje.");
    }
  };

  const preview = settings.template
    .replace(/\{paciente\}/g, "Maria")
    .replace(/\{clinica\}/g, "Clínica Exemplo");

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <Cake className="h-5 w-5 text-accent" />
            Automação de aniversários
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie uma mensagem de feliz aniversário automaticamente todo dia
            via WhatsApp para os pacientes do dia.
          </p>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(v) => setSettings((s) => ({ ...s, enabled: v }))}
          aria-label="Ativar automação de aniversários"
        />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="birthday-hour">Horário de envio (BRT)</Label>
          <Input
            id="birthday-hour"
            type="number"
            min={0}
            max={23}
            value={settings.send_hour}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                send_hour: Math.min(23, Math.max(0, Number(e.target.value) || 0)),
              }))
            }
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Mensagens serão enviadas perto deste horário a cada dia.
          </p>
        </div>
        <div className="flex flex-col justify-end">
          <p className="text-xs text-muted-foreground">
            Última execução: {" "}
            <span className="font-medium text-foreground">
              {settings.last_run_on
                ? new Date(settings.last_run_on + "T00:00:00").toLocaleDateString("pt-BR")
                : "—"}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="birthday-template">Mensagem</Label>
        <Textarea
          id="birthday-template"
          rows={3}
          value={settings.template}
          onChange={(e) =>
            setSettings((s) => ({ ...s, template: e.target.value }))
          }
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Variáveis disponíveis: <code>{"{paciente}"}</code>,{" "}
          <code>{"{clinica}"}</code>
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pré-visualização
        </p>
        <p className="mt-1 whitespace-pre-wrap">{preview}</p>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Requisitos:</strong> WhatsApp em
        modo API (ou Ambos) com credenciais Meta verificadas. Pacientes
        precisam ter <em>data de nascimento</em> e <em>telefone</em> cadastrados.
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={saving} variant="hero">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
        <Button onClick={handleRunNow} disabled={running} variant="outline">
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
          Rodar agora
        </Button>
      </div>
    </section>
  );
}
