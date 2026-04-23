import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import DashboardLayout from "./pages/dashboard/DashboardLayout.tsx";
import Dashboard from "./pages/dashboard/Dashboard.tsx";
import Agenda from "./pages/dashboard/Agenda.tsx";
import Pacientes from "./pages/dashboard/Pacientes.tsx";
import Profissionais from "./pages/dashboard/Profissionais.tsx";
import Financeiro from "./pages/dashboard/Financeiro.tsx";
import Configuracoes from "./pages/dashboard/Configuracoes.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="profissionais" element={<Profissionais />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
