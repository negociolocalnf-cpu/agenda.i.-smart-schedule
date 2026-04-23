import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { Construction } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  description: string;
}

const PlaceholderPage = ({ title, subtitle, icon: Icon, description }: PlaceholderPageProps) => {
  return (
    <>
      <DashboardTopbar title={title} subtitle={subtitle} />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-soft">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-elegant">
            <Icon className="h-7 w-7" />
          </div>
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Construction className="h-3.5 w-3.5" />
            Em construção
          </div>
        </div>
      </div>
    </>
  );
};

export default PlaceholderPage;
