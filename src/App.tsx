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
import DevisModule from "@/pages/devis/DevisModule";
import OperationsModule from "@/pages/operations/OperationsModule";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Chargement...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
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
        <Route path="/devis/*" element={<DevisModule />} />
        <Route path="/operations" element={<OperationsModule />} />
        <Route path="/factures" element={<PlaceholderPage title="Facturation" description="Gérez les factures et suivez les paiements." />} />
        <Route path="/achats" element={<PlaceholderPage title="Demandes d'achat" description="Créez et validez les demandes d'achat." />} />
        <Route path="/parc-auto" element={<PlaceholderPage title="Parc Automobile" description="Gérez vos camions et leur maintenance." />} />
        <Route path="/maintenance" element={<PlaceholderPage title="Maintenance" description="Suivez les demandes de maintenance." />} />
        <Route path="/calendrier" element={<PlaceholderPage title="Calendrier DG" description="Gérez l'agenda de la Direction Générale." />} />
        <Route path="/clients" element={<PlaceholderPage title="Gestion des Clients" description="Consultez et gérez votre base clients." />} />
        <Route path="/chauffeurs" element={<PlaceholderPage title="Chauffeurs" description="Gérez les chauffeurs et leur disponibilité." />} />
        <Route path="/fournisseurs" element={<PlaceholderPage title="Fournisseurs" description="Gérez le référentiel fournisseurs." />} />
        <Route path="/paiements" element={<PlaceholderPage title="Paiements" description="Suivez les paiements clients et fournisseurs." />} />
        <Route path="/utilisateurs" element={<PlaceholderPage title="Utilisateurs" description="Gérez les comptes utilisateurs et les rôles." />} />
        <Route path="/rapports" element={<PlaceholderPage title="Rapports & Statistiques" description="Consultez les rapports de performance." />} />
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
