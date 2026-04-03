import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import PlaceholderPage from "@/pages/placeholder/PlaceholderPage";
import CalendrierPage from "@/pages/calendrier/CalendrierPage";
import DevisModule from "@/pages/devis/DevisModule";
import OperationsModule from "@/pages/operations/OperationsModule";
import ParcAutoModule from "@/pages/parc-auto/ParcAutoModule";
import ClientsModule from "@/pages/clients/ClientsModule";
import AchatsModule from "@/pages/achats/AchatsModule";
import FinanceModule from "@/pages/finance/FinanceModule";
import RapportsPage from "@/pages/rapports/RapportsPage";
import ParametresModule from "@/pages/parametres/ParametresModule";
import ProfilPage from "@/pages/parametres/ProfilPage";
import ApprobationsPage from "@/pages/approbations/ApprobationsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Chargement...</div>;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/approbations" element={<ApprobationsPage />} />
        <Route path="/devis/*" element={<DevisModule />} />
        <Route path="/operations" element={<OperationsModule />} />
        <Route path="/factures" element={<FinanceModule />} />
        <Route path="/achats" element={<AchatsModule />} />
        <Route path="/parc-auto" element={<ParcAutoModule />} />
        <Route path="/maintenance" element={<Navigate to="/parc-auto" replace />} />
        <Route path="/calendrier" element={<CalendrierPage />} />
        <Route path="/clients" element={<ClientsModule />} />
        <Route path="/chauffeurs" element={<Navigate to="/parc-auto" replace />} />
        <Route path="/fournisseurs" element={<Navigate to="/achats" replace />} />
        <Route path="/paiements" element={<Navigate to="/factures" replace />} />
        <Route path="/utilisateurs" element={<Navigate to="/parametres" replace />} />
        <Route path="/rapports" element={<RapportsPage />} />
        <Route path="/parametres" element={<ParametresModule />} />
        <Route path="/profil" element={<ProfilPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
