import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Dashboard from './pages/Dashboard';
import Workouts from './pages/Workouts';
import AIPlan from './pages/AIPlan';
import WorkoutDetail from './pages/WorkoutDetail';
import WorkoutForm from './pages/WorkoutForm';
import Exercises from './pages/Exercises';
import CalendarPage from './pages/Calendar';
import Goals from './pages/Goals';
import ProgressPage from './pages/Progress';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';

const LoginRedirect = () => {
  const location = useLocation();
  return (
    <Navigate
      to={`/login?redirect=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`}
      replace
    />
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
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
      <Route element={<ProtectedRoute unauthenticatedElement={<LoginRedirect />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/workouts/ai-plan" element={<AIPlan />} />
          <Route path="/workouts/new" element={<WorkoutForm />} />
          <Route path="/workouts/:id" element={<WorkoutDetail />} />
          <Route path="/workouts/:id/edit" element={<WorkoutForm />} />
          <Route path="/exercise" element={<Exercises />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
