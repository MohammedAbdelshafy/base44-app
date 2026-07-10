import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleRoute from '@/components/RoleRoute';
import { LangProvider } from '@/lib/i18n';
import { getHomeRoute } from '@/lib/roles';

// Auth pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// App pages
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Kpis from '@/pages/Kpis';
import Buildings from '@/pages/Buildings';
import Pickups from '@/pages/Pickups';
import TodaysRoute from '@/pages/TodaysRoute';
import Payments from '@/pages/Payments';
import Commissions from '@/pages/Commissions';
import Warehouse from '@/pages/Warehouse';
import Vehicles from '@/pages/Vehicles';
import SalesMembers from '@/pages/SalesMembers';
import UserManagement from '@/pages/UserManagement';
import Customers from '@/pages/Customers';
import DealingRoom from '@/pages/DealingRoom';
import Drivers from '@/pages/Drivers';
import DoormanSignup from '@/pages/DoormanSignup';
import NewRequests from '@/pages/NewRequests';
import MyBuilding from '@/pages/MyBuilding';
import Reports from '@/pages/Reports';

// Mission Control pages
import MissionControlDashboard from '@/pages/MissionControlDashboard';
import MissionDetail from '@/pages/MissionDetail';
import ChronicleSearch from '@/pages/ChronicleSearch';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-navy/20 border-t-navy rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground font-heading">DAWRIX</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/bawab-signup" element={<Navigate to="/doorman-signup" replace />} />
      <Route path="/doorman-signup" element={<DoormanSignup />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<RoleRoute module="dashboard"><Dashboard /></RoleRoute>} />
          <Route path="/kpis" element={<RoleRoute module="kpis"><Kpis /></RoleRoute>} />
          <Route path="/buildings" element={<RoleRoute module="buildings"><Buildings /></RoleRoute>} />
          <Route path="/pickups" element={<RoleRoute module="pickups"><Pickups /></RoleRoute>} />
          <Route path="/todays-route" element={<RoleRoute module="todays_route"><TodaysRoute /></RoleRoute>} />
          <Route path="/payments" element={<RoleRoute module="payments"><Payments /></RoleRoute>} />
          <Route path="/commissions" element={<RoleRoute module="commissions"><Commissions /></RoleRoute>} />
          <Route path="/warehouse" element={<RoleRoute module="warehouse"><Warehouse /></RoleRoute>} />
          <Route path="/vehicles" element={<RoleRoute module="vehicles"><Vehicles /></RoleRoute>} />
          <Route path="/sales-members" element={<RoleRoute module="sales_members"><SalesMembers /></RoleRoute>} />
          <Route path="/users" element={<RoleRoute module="users"><UserManagement /></RoleRoute>} />
          <Route path="/customers" element={<RoleRoute module="customers"><Customers /></RoleRoute>} />
          <Route path="/dealing-room" element={<RoleRoute module="dealing_room"><DealingRoom /></RoleRoute>} />
          <Route path="/drivers" element={<RoleRoute module="drivers"><Drivers /></RoleRoute>} />
          <Route path="/new-requests" element={<RoleRoute module="new_requests"><NewRequests /></RoleRoute>} />
          <Route path="/my-building" element={<RoleRoute module="my_building"><MyBuilding /></RoleRoute>} />
          <Route path="/reports" element={<RoleRoute module="reports"><Reports /></RoleRoute>} />
        </Route>
      </Route>
      {/* Mission Control (independent of business app auth) */}
      <Route path="/mission-control" element={<MissionControlDashboard />} />
      <Route path="/mission-control/:missionId" element={<MissionDetail />} />
      <Route path="/chronicle" element={<ChronicleSearch />} />

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </LangProvider>
  )
}

export default App