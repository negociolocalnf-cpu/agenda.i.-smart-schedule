import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";
import { StatCard } from "@/components/dashboard/StatCard";
import { AgendaTimeline, type Appointment } from "@/components/dashboard/AgendaTimeline";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { UpcomingPatients } from "@/components/dashboard/UpcomingPatients";
import { Calendar, Users, Wallet, AlertTriangle } from "lucide-react";

const todayAppointments: Appointment[] = [
  { id: "1", time: "08:30", duration: 1, patient: "Carla Vieira", procedure: "Limpeza", professional: "Dra. Beatriz", type: "limpeza", status: "confirmado" },
  { id: "2", time: "09:00", duration: 1, patient: "Ana Carolina Silva", procedure: "Limpeza", professional: "Dr. Lucas", type: "limpeza", status: "confirmado" },
  { id: "3", time: "10:30", duration: 1, patient: "Pedro Henrique Costa", procedure: "Avaliação inicial", professional: "Dra. Beatriz", type: "avaliacao", status: "pendente" },
  { id: "4", time: "11:00", duration: 2, patient: "Juliana Mendes", procedure: "Tratamento de canal", professional: "Dr. Lucas", type: "tratamento", status: "confirmado" },
  { id: "5", time: "14:00", duration: 1, patient: "Roberto Almeida", procedure: "Retorno pós-cirúrgico", professional: "Dra. Beatriz", type: "retorno", status: "confirmado" },
  { id: "6", time: "15:30", duration: 1, patient: "Mariana Souza", procedure: "Avaliação", professional: "Dr. Lucas", type: "avaliacao", status: "pendente" },
  { id: "7", time: "16:30", duration: 1, patient: "Felipe Ramos", procedure: "Urgência - dor", professional: "Dra. Beatriz", type: "urgencia", status: "confirmado" },
];

const Dashboard = () => {
  return (
    <>
      <DashboardTopbar
        title="Boa tarde, Dra. Beatriz 👋"
        subtitle="Aqui está o resumo da sua clínica hoje"
      />

      <div className="space-y-6 p-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Consultas hoje"
            value="24"
            icon={Calendar}
            trend={{ value: "+8%", up: true }}
            accent="primary"
          />
          <StatCard
            label="Receita mensal"
            value="R$ 48.250"
            icon={Wallet}
            trend={{ value: "+12,4%", up: true }}
            accent="success"
          />
          <StatCard
            label="Pacientes ativos"
            value="312"
            icon={Users}
            trend={{ value: "+5,2%", up: true }}
            accent="accent"
          />
          <StatCard
            label="Taxa de faltas"
            value="6,8%"
            icon={AlertTriangle}
            trend={{ value: "-2,1%", up: true }}
            accent="warning"
          />
        </div>

        {/* Charts + Patients */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <UpcomingPatients />
        </div>

        {/* Agenda */}
        <AgendaTimeline appointments={todayAppointments} />
      </div>
    </>
  );
};

export default Dashboard;
