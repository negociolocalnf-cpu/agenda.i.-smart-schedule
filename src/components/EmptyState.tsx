import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    /** Optional icon for the action button. */
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Reusable empty state — used across listing pages so users always see
 * something actionable instead of a blank panel.
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) => {
  const ActionIcon = action?.icon;
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border bg-card p-12 text-center",
        className,
      )}
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <Button variant="hero" onClick={action.onClick}>
              {ActionIcon && <ActionIcon className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
