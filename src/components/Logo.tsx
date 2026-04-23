import { CalendarCheck2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: "default" | "light";
}

export const Logo = ({ className, showText = true, variant = "default" }: LogoProps) => {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
        <CalendarCheck2 className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-background" />
      </div>
      {showText && (
        <span
          className={cn(
            "font-display text-lg font-bold tracking-tight",
            variant === "light" ? "text-primary-foreground" : "text-foreground"
          )}
        >
          Agend<span className="text-accent">.AI</span>
        </span>
      )}
    </div>
  );
};
