import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { RequireSubscription } from "@/components/RequireSubscription";
import { GlobalSearch, ShortcutsHelp } from "@/components/dashboard/GlobalSearch";

const DashboardLayout = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable === true;

      // Cmd/Ctrl + K — global search (works even when typing)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        return;
      }

      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "n") {
        e.preventDefault();
        navigate("/dashboard/agenda?new=1");
      } else if (key === "p") {
        e.preventDefault();
        navigate("/dashboard/pacientes?new=1");
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  // Allow `?shortcuts=1` query param to open the help overlay
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    if (sp.get("shortcuts") === "1") {
      setHelpOpen(true);
      sp.delete("shortcuts");
      navigate(`${location.pathname}${sp.toString() ? `?${sp.toString()}` : ""}`, {
        replace: true,
      });
    }
  }, [location, navigate]);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar onOpenSearch={() => setSearchOpen(true)} />
      <main className="flex-1 overflow-x-hidden">
        <RequireSubscription>
          <Outlet />
        </RequireSubscription>
      </main>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
};

export default DashboardLayout;
