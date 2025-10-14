import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authService, User } from '@/lib/auth';
import { api, setAuthToken, User as ApiUser } from '@/lib/api';
import Login from './pages/Login';
import RegisterClient from './pages/RegisterClient';
import RegisterTransporter from './pages/RegisterTransporter';
import AdminPortal from './components/AdminPortal';
import ClientPortal from './components/ClientPortal';
import TransporterPortal from './components/TransporterPortal';
import PodsPage from './pages/PodsPage';
import ClientReviewPage from './pages/ClientReviewPage';
import LoadFinancialsPage from './pages/LoadFinancialsPage';
import ChatPage from './pages/ChatPage';
import NotFound from './pages/NotFound';
import AuthGuard from './components/AuthGuard';

const queryClient = new QueryClient();

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Try to get user from authService (may be restored from localStorage)
      const user = authService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setLoading(false);
        return;
      }

      // No user yet; try to restore from token and fetch profile before rendering
      try {
        const token = localStorage.getItem('fleetxchange_token');
        if (token) {
          setAuthToken(token);
          const resp = await api.auth.getProfile();
          const apiUser: ApiUser = resp.user;
          const converted: User = {
            id: apiUser.id,
            email: apiUser.email,
            userType: apiUser.userType.toLowerCase() as 'admin' | 'client' | 'transporter',
            status: apiUser.status.toLowerCase() as 'active' | 'pending' | 'rejected' | 'suspended',
            profile: {
              companyName: apiUser.companyName,
              contactPerson: apiUser.contactPerson,
              phone: apiUser.phone,
              address: apiUser.address,
              businessRegistration: apiUser.businessRegistration,
              taxId: apiUser.taxId,
            },
            createdAt: apiUser.createdAt,
            lastLogin: apiUser.lastLogin,
          };
          setCurrentUser(converted);
          try { localStorage.setItem('fleetxchange_user', JSON.stringify(converted)); } catch {}
        }
      } catch (err) {
        console.error('Failed to restore user profile on app init:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route 
              path="/login" 
              element={<Login onLogin={handleLogin} />} 
            />
            <Route 
              path="/register/client" 
              element={<RegisterClient />} 
            />
            <Route 
              path="/register/transporter" 
              element={<RegisterTransporter />} 
            />
            <Route
              path="/dashboard"
              element={
                currentUser ? (
                  currentUser.userType === 'admin' ? (
                    <AdminPortal />
                  ) : currentUser.userType === 'client' ? (
                    <ClientPortal user={currentUser} onLogout={handleLogout} />
                  ) : (
                    <TransporterPortal />
                  )
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />
            <Route 
              path="/admin" 
              element={
                currentUser?.userType === 'admin' ? (
                  <AdminPortal />
                ) : (
                  <Login onLogin={handleLogin} />
                )
              } 
            />
            <Route 
              path="/client" 
              element={
                currentUser?.userType === 'client' ? (
                  <ClientPortal user={currentUser} onLogout={handleLogout} />
                ) : (
                  <Login onLogin={handleLogin} />
                )
              } 
            />
            <Route 
              path="/transporter" 
              element={
                currentUser?.userType === 'transporter' ? (
                  <TransporterPortal />
                ) : (
                  <Login onLogin={handleLogin} />
                )
              } 
            />
            <Route 
              path="/pods" 
              element={
                currentUser?.userType === 'transporter' ? (
                  <PodsPage />
                ) : (
                  <Login onLogin={handleLogin} />
                )
              } 
            />
            <Route 
              path="/client/review" 
              element={
                currentUser?.userType === 'client' ? (
                  <ClientReviewPage />
                ) : (
                  <Login onLogin={handleLogin} />
                )
              } 
            />
            <Route 
              path="/load/:loadId/financials" 
              element={
                currentUser ? (
                  <LoadFinancialsPage />
                ) : (
                  <Login onLogin={handleLogin} />
                )
              } 
            />
            <Route 
              path="/chat/:loadId" 
              element={
                <AuthGuard>
                  <ChatPage />
                </AuthGuard>
              } 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;