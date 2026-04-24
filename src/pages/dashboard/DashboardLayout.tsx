import { Outlet } from "react-router-dom";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { RequireSubscription } from "@/components/RequireSubscription";

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-x-hidden">
        <RequireSubscription>
          <Outlet />
        </RequireSubscription>
      </main>
    </div>
  );
};

export default DashboardLayout;

