import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar,
  Users,
  Stethoscope,
  Wallet,
  Settings,
  MessageCircle,
  LayoutDashboard,
  Plus,
  KeyRound,
  Search,
} from "lucide-react";

interface SearchResults {
  patients: Array<{ id: string; name: string; phone: string | null }>;
  professionals: Array<{ id: string; name: string; specialty: string | null }>;
  appointments: Array<{
    id: string;
    starts_at: string;
    patient_name: string | null;
    professional_name: string | null;
  }>;
}

const NAV_ITEMS = [
  { label: "Visão geral", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Agenda", icon: Calendar, to: "/dashboard/agenda" },
  { label: "Pacientes", icon: Users, to: "/dashboard/pacientes" },
  { label: "Profissionais", icon: Stethoscope, to: "/dashboard/profissionais" },
  { label: "Financeiro", icon: Wallet, to: "/dashboard/financeiro" },
  { label: "Confirmações", icon: MessageCircle, to: "/dashboard/confirmacoes" },
  { label: "Configurações", icon: Settings, to: "/dashboard/configuracoes" },
];

const QUICK_ACTIONS = [
  {
    label: "Nova consulta",
    icon: Plus,
    to: "/dashboard/agenda?new=1",
    shortcut: "N",
  },
  {
    label: "Novo paciente",
    icon: Plus,
    to: "/dashboard/pacientes?new=1",
    shortcut: "P",
  },
  {
    label: "Mostrar atalhos de teclado",
    icon: KeyRound,
    to: "?shortcuts=1",
    shortcut: "?",
  },
];

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    patients: [],
    professionals: [],
    appointments: [],
  });

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!user || query.trim().length < 2) {
      setResults({ patients: [], professionals: [], appointments: [] });
      return;
    }
    const term = query.trim();
    const escaped = term.replace(/[%_,]/g, (m) => `\\${m}`);
    const handle = setTimeout(async () => {
      const [patients, professionals, appointments] = await Promise.all([
        supabase
          .from("patients")
          .select("id, name, phone")
          .or(`name.ilike.%${escaped}%,phone.ilike.%${escaped}%,email.ilike.%${escaped}%`)
          .order("name")
          .limit(5),
        supabase
          .from("professionals")
          .select("id, name, specialty")
          .or(`name.ilike.%${escaped}%,specialty.ilike.%${escaped}%`)
          .order("name")
          .limit(5),
        supabase
          .from("appointments")
          .select(
            "id, starts_at, patient:patients(name), professional:professionals(name)",
          )
          .order("starts_at", { ascending: false })
          .limit(20),
      ]);

      const apptRows = ((appointments.data ?? []) as Array<{
        id: string;
        starts_at: string;
        patient: { name: string } | null;
        professional: { name: string } | null;
      }>)
        .filter((a) =>
          (a.patient?.name ?? "")
            .toLowerCase()
            .includes(term.toLowerCase()) ||
          (a.professional?.name ?? "")
            .toLowerCase()
            .includes(term.toLowerCase()),
        )
        .slice(0, 5)
        .map((a) => ({
          id: a.id,
          starts_at: a.starts_at,
          patient_name: a.patient?.name ?? null,
          professional_name: a.professional?.name ?? null,
        }));

      setResults({
        patients: (patients.data ?? []) as SearchResults["patients"],
        professionals: (professionals.data ?? []) as SearchResults["professionals"],
        appointments: apptRows,
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query, user]);

  const go = useCallback(
    (to: string) => {
      onOpenChange(false);
      navigate(to);
    },
    [navigate, onOpenChange],
  );

  const totalResults =
    results.patients.length +
    results.professionals.length +
    results.appointments.length;

  const showResults = query.trim().length >= 2;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar pacientes, profissionais, consultas…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {showResults && totalResults === 0 && (
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        )}

        {showResults && results.patients.length > 0 && (
          <CommandGroup heading="Pacientes">
            {results.patients.map((p) => (
              <CommandItem
                key={p.id}
                value={`paciente-${p.id}-${p.name}`}
                onSelect={() => go(`/dashboard/pacientes?focus=${p.id}`)}
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{p.name}</span>
                {p.phone && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {p.phone}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showResults && results.professionals.length > 0 && (
          <CommandGroup heading="Profissionais">
            {results.professionals.map((p) => (
              <CommandItem
                key={p.id}
                value={`prof-${p.id}-${p.name}`}
                onSelect={() => go(`/dashboard/profissionais?focus=${p.id}`)}
              >
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <span>{p.name}</span>
                {p.specialty && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {p.specialty}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showResults && results.appointments.length > 0 && (
          <CommandGroup heading="Consultas">
            {results.appointments.map((a) => (
              <CommandItem
                key={a.id}
                value={`appt-${a.id}-${a.patient_name ?? ""}-${a.professional_name ?? ""}`}
                onSelect={() => {
                  const day = a.starts_at.slice(0, 10);
                  go(`/dashboard/agenda?date=${day}`);
                }}
              >
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {a.patient_name ?? "Paciente"} ·{" "}
                  {a.professional_name ?? "Profissional"}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(a.starts_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showResults && <CommandSeparator />}

        <CommandGroup heading="Ações rápidas">
          {QUICK_ACTIONS.map((a) => (
            <CommandItem
              key={a.label}
              value={`action-${a.label}`}
              onSelect={() => go(a.to)}
            >
              <a.icon className="h-4 w-4 text-muted-foreground" />
              <span>{a.label}</span>
              <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {a.shortcut}
              </kbd>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Navegação">
          {NAV_ITEMS.map((n) => (
            <CommandItem
              key={n.to}
              value={`nav-${n.label}`}
              onSelect={() => go(n.to)}
            >
              <n.icon className="h-4 w-4 text-muted-foreground" />
              <span>{n.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  const isMac = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      /Mac|iPod|iPhone|iPad/.test(navigator.platform),
    [],
  );
  const cmd = isMac ? "⌘" : "Ctrl";
  const rows: Array<[string, ReactNode]> = [
    ["Busca global", <Combo key="cmd" keys={[cmd, "K"]} />],
    ["Nova consulta", <Combo key="n" keys={["N"]} />],
    ["Novo paciente", <Combo key="p" keys={["P"]} />],
    ["Mostrar atalhos", <Combo key="?" keys={["?"]} />],
  ];
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Atalhos de teclado"
        value=""
        onValueChange={() => {}}
        readOnly
      />
      <CommandList>
        <CommandGroup heading="Atalhos de teclado">
          {rows.map(([label, combo]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm"
            >
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                {label}
              </span>
              {combo}
            </div>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function Combo({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}
