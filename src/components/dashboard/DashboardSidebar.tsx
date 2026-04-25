import { NavLink, Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Wallet,
  Settings,
  Stethoscope,
  Bell,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";

const items = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Visão geral", end: true },
  { to: "/dashboard/agenda", icon: Calendar, label: "Agenda" },
  { to: "/dashboard/pacientes", icon: Users, label: "Pacientes" },
  { to: "/dashboard/profissionais", icon: Stethoscope, label: "Profissionais" },
  { to: "/dashboard/financeiro", icon: Wallet, label: "Financeiro" },
  { to: "/dashboard/confirmacoes", icon: MessageCircle, label: "Confirmações" },
  { to: "/dashboard/configuracoes", icon: Settings, label: "Configurações" },
];

export const DashboardSidebar = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isActive, planName, loading } = useSubscription();

  const handleLogout = async () => {
    await signOut();
    toast.success("Sessão encerrada");
    navigate("/");
  };

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center border-b border-sidebar-border px-6">
        <Link to="/">
          <Logo variant="light" />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive: navActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-smooth",
                navActive
                  ? "bg-sidebar-accent text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-primary-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 rounded-xl bg-sidebar-accent/50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-sidebar-primary-foreground">
            <Bell className="h-3.5 w-3.5 text-accent" />
            {loading
              ? "Carregando…"
              : isActive
              ? `Plano ${planName ?? ""}`
              : "Sem assinatura ativa"}
          </div>
          {!loading && (
            <div className="mt-1 text-xs text-sidebar-foreground">
              {isActive ? (
                "Assinatura ativa"
              ) : (
                <Link to="/dashboard/configuracoes" className="underline">
                  Ver planos
                </Link>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-sidebar-foreground transition-smooth hover:bg-sidebar-accent/60 hover:text-sidebar-primary-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
};
