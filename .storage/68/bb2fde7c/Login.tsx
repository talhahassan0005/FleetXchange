import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Truck, Users, Shield, UserPlus, KeyRound } from 'lucide-react';
import { authService } from '@/lib/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await authService.login(email, password);
      if (user) {
        navigate('/dashboard');
      } else {
        setError('Invalid credentials or account not approved');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { type: 'Admin', email: 'admin@fleetxchange.com', icon: Shield, color: 'text-red-600', bgColor: 'bg-red-50 hover:bg-red-100' },
    { type: 'Client', email: 'client@demo.com', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100' },
    { type: 'Transporter', email: 'transporter@demo.com', icon: Truck, color: 'text-green-600', bgColor: 'bg-green-50 hover:bg-green-100' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full">
              <Truck className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            FleetXchange
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Logistics Platform</p>
        </div>

        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription className="text-blue-100">
              Sign in to access your FleetXchange portal
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              
              <div className="flex justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 mb-4">Don't have an account?</p>
              <Link to="/register">
                <Button variant="outline" className="w-full h-11 border-2 hover:bg-blue-50">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create New Account
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <KeyRound className="mr-2 h-4 w-4" />
              Demo Accounts
            </CardTitle>
            <CardDescription className="text-xs">
              Click to use demo credentials (any password works)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <div
                  key={account.type}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${account.bgColor} border border-gray-200`}
                  onClick={() => setEmail(account.email)}
                >
                  <div className="flex items-center space-x-3">
                    <account.icon className={`h-5 w-5 ${account.color}`} />
                    <div>
                      <span className="text-sm font-medium text-gray-900">{account.type}</span>
                      <p className="text-xs text-gray-600">{account.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}