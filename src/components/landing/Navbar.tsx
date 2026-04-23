import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const links = [
    { href: "#features", label: "Recursos" },
    { href: "#how", label: "Como funciona" },
    { href: "#pricing", label: "Planos" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <nav className="container flex h-16 items-center justify-between">
        <Link to="/" aria-label="Agend.AI">
          <Logo />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <Button variant="hero" size="sm" asChild>
              <Link to="/dashboard">Painel</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <a href="#pricing">Assinar</a>
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Abrir menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </nav>

      <div
        className={cn(
          "border-t border-border/60 md:hidden",
          open ? "block" : "hidden"
        )}
      >
        <div className="container flex flex-col gap-3 py-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-muted-foreground"
            >
              {l.label}
            </a>
          ))}
          {user ? (
            <Button variant="hero" size="sm" asChild className="mt-2">
              <Link to="/dashboard" onClick={() => setOpen(false)}>Painel</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth" onClick={() => setOpen(false)}>Entrar</Link>
              </Button>
              <Button variant="hero" size="sm" asChild className="mt-2">
                <a href="#pricing" onClick={() => setOpen(false)}>Assinar</a>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
