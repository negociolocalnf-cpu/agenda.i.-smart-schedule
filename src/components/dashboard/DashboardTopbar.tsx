import { Bell, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TopbarProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick?: () => void };
}

export const DashboardTopbar = ({ title, subtitle, action }: TopbarProps) => {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center gap-4 px-6">
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente, consulta..."
            className="h-9 w-64 pl-9"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
        </Button>

        <Button variant="hero" size="sm" onClick={action?.onClick}>
          <Plus className="h-4 w-4" />
          {action?.label ?? "Nova consulta"}
        </Button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary font-semibold text-primary-foreground shadow-sm">
          DR
        </div>
      </div>
    </header>
  );
};
