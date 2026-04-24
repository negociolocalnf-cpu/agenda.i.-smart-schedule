import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  useWhatsappSettings,
  type WhatsappMode,
  type SavePayload,
} from "@/hooks/useWhatsappSettings";

const TEMPLATE_VARS = ["{paciente}", "{profissional}", "{data}", "{hora}", "{clinica}"];

const SAMPLE = {
  paciente: "Maria Silva",
  profissional: "Dr. João",
  data: "25/04/2026",
  hora: "14:30",
  clinica: "Clínica Exemplo",
};

function renderPreview(template: string, clinicName: string | null) {
  return template
    .replaceAll("{paciente}", SAMPLE.paciente)
    .replaceAll("{profissional}", SAMPLE.profissional)
    .replaceAll("{data}", SAMPLE.data)
    .replaceAll("{hora}", SAMPLE.hora)
    .replaceAll("{clinica}", clinicName?.trim() || SAMPLE.clinica);
}

export function WhatsappSettingsCard() {
  const { settings, loading, saving, verifying, save, verify, defaults } =
    useWhatsappSettings();

  const [mode, setMode] = useState<WhatsappMode>("manual");
  const [clinicName, setClinicName] = useState("");
  const [confirmationTpl, setConfirmationTpl] = useState(defaults.confirmation_template);
  const [reminderTpl, setReminderTpl] = useState(defaults.reminder_template);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  // Hydrate from server state
  useEffect(() => {
    if (!settings) return;
    setMode(settings.mode);
    setClinicName(settings.clinic_name ?? "");
    setConfirmationTpl(settings.confirmation_template);
    setReminderTpl(settings.reminder_template);
    setPhoneNumberId(settings.meta_phone_number_id ?? "");
    setBusinessAccountId(settings.meta_business_account_id ?? "");
    setAccessToken("");
  }, [settings]);

  const showApiFields = mode !== "manual";

  const dirty = useMemo(() => {
    if (!settings) {
      return (
        mode !== "manual" ||
        clinicName !== "" ||
        confirmationTpl !== defaults.confirmation_template ||
        reminderTpl !== defaults.reminder_template ||
        phoneNumberId !== "" ||
        businessAccountId !== "" ||
        accessToken !== ""
      );
    }
    return (
      mode !== settings.mode ||
      (clinicName ?? "") !== (settings.clinic_name ?? "") ||
      confirmationTpl !== settings.confirmation_template ||
      reminderTpl !== settings.reminder_template ||
      (phoneNumberId ?? "") !== (settings.meta_phone_number_id ?? "") ||
      (businessAccountId ?? "") !== (settings.meta_business_account_id ?? "") ||
      accessToken !== ""
    );
  }, [
    settings,
    mode,
    clinicName,
    confirmationTpl,
    reminderTpl,
    phoneNumberId,
    businessAccountId,
    accessToken,
    defaults,
  ]);

  const handleReset = () => {
    if (!settings) {
      setMode("manual");
      setClinicName("");
      setConfirmationTpl(defaults.confirmation_template);
      setReminderTpl(defaults.reminder_template);
      setPhoneNumberId("");
      setBusinessAccountId("");
      setAccessToken("");
      return;
    }
    setMode(settings.mode);
    setClinicName(settings.clinic_name ?? "");
    setConfirmationTpl(settings.confirmation_template);
    setReminderTpl(settings.reminder_template);
    setPhoneNumberId(settings.meta_phone_number_id ?? "");
    setBusinessAccountId(settings.meta_business_account_id ?? "");
    setAccessToken("");
  };

  const handleSave = async () => {
    if (confirmationTpl.trim().length === 0 || reminderTpl.trim().length === 0) {
      toast.error("Os templates não podem ficar vazios.");
      return;
    }
    if (showApiFields && phoneNumberId.trim().length === 0) {
      toast.error("Informe o Phone Number ID para o modo API.");
      return;
    }
    const payload: SavePayload = {
      mode,
      clinic_name: clinicName.trim() ? clinicName.trim() : null,
      confirmation_template: confirmationTpl.trim(),
      reminder_template: reminderTpl.trim(),
      meta_phone_number_id: phoneNumberId.trim() ? phoneNumberId.trim() : null,
      meta_business_account_id: businessAccountId.trim()
        ? businessAccountId.trim()
        : null,
      meta_access_token: accessToken.trim() || null,
    };
    try {
      await save(payload);
      setAccessToken("");
      toast.success("Configurações salvas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    }
  };

  const handleVerify = async () => {
    try {
      const res = await verify();
      if (res.ok) {
        toast.success(
          res.verified_name
            ? `Verificado: ${res.verified_name} (${res.display_phone_number})`
            : "Credenciais válidas",
        );
      } else {
        toast.error(res.error || "Credenciais inválidas");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na verificação");
    }
  };

  const status = settings?.verification_status ?? "not_verified";

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            <MessageCircle className="h-5 w-5 text-primary" />
            WhatsApp
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirme consultas pelo seu próprio número, no modo manual ou via API
            oficial da Meta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium">
            Modo:{" "}
            {mode === "manual" ? "Manual" : mode === "api" ? "API oficial" : "Ambos"}
          </span>
          {showApiFields && <StatusBadge status={status} />}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Modo */}
          <div className="space-y-3">
            <Label>Modo de envio</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as WhatsappMode)}
              className="grid gap-2 sm:grid-cols-3"
            >
              <ModeOption
                value="manual"
                title="Manual"
                description="Abre wa.me com a mensagem pronta no seu celular."
              />
              <ModeOption
                value="api"
                title="API oficial"
                description="Envio em segundo plano via Meta Cloud API."
              />
              <ModeOption
                value="both"
                title="Ambos"
                description="Você escolhe na hora de enviar cada mensagem."
              />
            </RadioGroup>
          </div>

          {/* Identificação */}
          <div className="space-y-2">
            <Label htmlFor="clinic_name">Nome da clínica (variável {"{clinica}"})</Label>
            <Input
              id="clinic_name"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="Ex: Clínica Bem-Estar"
              maxLength={120}
            />
          </div>

          {/* Templates */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="confirmation_template">Mensagem de confirmação</Label>
              <Textarea
                id="confirmation_template"
                value={confirmationTpl}
                onChange={(e) => setConfirmationTpl(e.target.value)}
                rows={3}
                maxLength={1000}
                className="mt-2"
              />
              <p className="mt-2 rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Pré-visualização: </span>
                {renderPreview(confirmationTpl, clinicName)}
              </p>
            </div>

            <div>
              <Label htmlFor="reminder_template">Mensagem de lembrete</Label>
              <Textarea
                id="reminder_template"
                value={reminderTpl}
                onChange={(e) => setReminderTpl(e.target.value)}
                rows={3}
                maxLength={1000}
                className="mt-2"
              />
              <p className="mt-2 rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Pré-visualização: </span>
                {renderPreview(reminderTpl, clinicName)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Variáveis disponíveis:</span>
              {TEMPLATE_VARS.map((v) => (
                <code
                  key={v}
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                >
                  {v}
                </code>
              ))}
            </div>
          </div>

          {/* Credenciais Meta */}
          {showApiFields && (
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Credenciais da Meta Cloud API
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone_number_id">Phone Number ID</Label>
                  <Input
                    id="phone_number_id"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="Ex: 1234567890"
                    maxLength={64}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="business_account_id">
                    Business Account ID <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Input
                    id="business_account_id"
                    value={businessAccountId}
                    onChange={(e) => setBusinessAccountId(e.target.value)}
                    placeholder="Ex: 9876543210"
                    maxLength={64}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="access_token">Access Token</Label>
                <div className="relative">
                  <Input
                    id="access_token"
                    type={showToken ? "text" : "password"}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder={
                      settings?.has_access_token
                        ? "•••• (mantém o atual — preencha só para substituir)"
                        : "Cole o access token"
                    }
                    maxLength={2048}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label={showToken ? "Ocultar token" : "Mostrar token"}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Encontre o Phone Number ID e gere um Access Token em{" "}
                  <a
                    href="https://business.facebook.com/wa/manage/phone-numbers"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    Meta Business Manager → WhatsApp
                  </a>
                  .
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3">
                <VerificationDetails
                  status={status}
                  verifiedAt={settings?.verified_at ?? null}
                  verifiedName={settings?.verified_name ?? null}
                  displayPhone={settings?.display_phone_number ?? null}
                  error={settings?.verification_error ?? null}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleVerify}
                  disabled={
                    verifying ||
                    !settings?.meta_phone_number_id ||
                    !settings?.has_access_token ||
                    dirty
                  }
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  Verificar credenciais
                </Button>
              </div>
              {dirty && (
                <p className="text-xs text-muted-foreground">
                  Salve as alterações antes de verificar as credenciais.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleReset}
              disabled={!dirty || saving}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={!dirty || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function ModeOption({
  value,
  title,
  description,
}: {
  value: string;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={`mode-${value}`}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3 transition hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
    >
      <RadioGroupItem id={`mode-${value}`} value={value} className="mt-0.5" />
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    not_verified: {
      label: "Não verificado",
      cls: "bg-muted text-muted-foreground",
      Icon: AlertCircle,
    },
    verifying: {
      label: "Verificando…",
      cls: "bg-warning/15 text-warning-foreground",
      Icon: Loader2,
    },
    valid: {
      label: "Verificado",
      cls: "bg-success/15 text-success",
      Icon: CheckCircle2,
    },
    invalid: {
      label: "Inválido",
      cls: "bg-destructive/15 text-destructive",
      Icon: AlertCircle,
    },
  };
  const { label, cls, Icon } = map[status] ?? map.not_verified;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`}
    >
      <Icon className={`h-3.5 w-3.5 ${status === "verifying" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}

function VerificationDetails({
  status,
  verifiedAt,
  verifiedName,
  displayPhone,
  error,
}: {
  status: string;
  verifiedAt: string | null;
  verifiedName: string | null;
  displayPhone: string | null;
  error: string | null;
}) {
  if (status === "valid") {
    return (
      <div className="text-xs">
        <div className="flex items-center gap-1.5 font-medium text-success">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Credenciais válidas
        </div>
        <div className="mt-0.5 text-muted-foreground">
          {verifiedName ? `${verifiedName} · ` : ""}
          {displayPhone ?? ""}
          {verifiedAt && (
            <>
              {" "}
              · verificado em{" "}
              {new Date(verifiedAt).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </>
          )}
        </div>
      </div>
    );
  }
  if (status === "invalid") {
    return (
      <div className="text-xs">
        <div className="flex items-center gap-1.5 font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5" />
          Credenciais inválidas
        </div>
        {error && <div className="mt-0.5 text-muted-foreground">{error}</div>}
      </div>
    );
  }
  if (status === "verifying") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Verificando com a Meta…
      </div>
    );
  }
  return (
    <div className="text-xs text-muted-foreground">
      Credenciais ainda não verificadas.
    </div>
  );
}
