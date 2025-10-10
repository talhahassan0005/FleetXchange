import { useEffect, useState } from 'react';
import { authService, User } from '@/lib/auth';
import AdminPortal from '@/components/AdminPortal';
import ClientPortal from '@/components/ClientPortal';
import TransporterPortal from '@/components/TransporterPortal';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderPortal = () => {
    switch (user.userType) {
      case 'admin':
        return <AdminPortal />;
      case 'client':
        return <ClientPortal />;
      case 'transporter':
        return <TransporterPortal />;
      default:
        return <div>Invalid user type</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderPortal()}
    </div>
  );
}