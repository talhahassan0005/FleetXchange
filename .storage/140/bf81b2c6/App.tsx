import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authService, User } from '@/lib/auth';
import Login from './pages/Login';
import AdminPortal from './components/AdminPortal';
import ClientPortal from './components/ClientPortal';
import TransporterPortal from './components/TransporterPortal';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    setLoading(false);
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
              element={
                currentUser ? (
                  // Redirect to appropriate dashboard based on user type
                  currentUser.userType === 'admin' ? (
                    <AdminPortal user={currentUser} onLogout={handleLogout} />
                  ) : currentUser.userType === 'client' ? (
                    <ClientPortal user={currentUser} onLogout={handleLogout} />
                  ) : (
                    <TransporterPortal user={currentUser} onLogout={handleLogout} />
                  )
                ) : (
                  <Login onLogin={handleLogin} />
                )
              } 
            />
            <Route 
              path="/login" 
              element={<Login onLogin={handleLogin} />} 
            />
            <Route 
              path="/dashboard" 
              element={
                currentUser ? (
                  currentUser.userType === 'admin' ? (
                    <AdminPortal user={currentUser} onLogout={handleLogout} />
                  ) : currentUser.userType === 'client' ? (
                    <ClientPortal user={currentUser} onLogout={handleLogout} />
                  ) : (
                    <TransporterPortal user={currentUser} onLogout={handleLogout} />
                  )
                ) : (
                  <Login onLogin={handleLogin} />
                )
              } 
            />
            <Route 
              path="/admin" 
              element={
                currentUser?.userType === 'admin' ? (
                  <AdminPortal user={currentUser} onLogout={handleLogout} />
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
                  <TransporterPortal user={currentUser} onLogout={handleLogout} />
                ) : (
                  <Login onLogin={handleLogin} />
                )
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