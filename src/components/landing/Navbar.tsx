import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Navbar = () => {
  const [open, setOpen] = useState(false);

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
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">Entrar</Link>
          </Button>
          <Button variant="hero" size="sm" asChild>
            <Link to="/dashboard">Teste grátis</Link>
          </Button>
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
          <Button variant="hero" size="sm" asChild className="mt-2">
            <Link to="/dashboard">Teste grátis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
