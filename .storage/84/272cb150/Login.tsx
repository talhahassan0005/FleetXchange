import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Truck, Shield, Users, ArrowRight, MapPin, Container } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="flex min-h-screen">
        {/* Left Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-left-5 duration-700">
            {/* Logo and Branding */}
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <img 
                  src="/src/assets/fleetxchange-logo.png" 
                  alt="FleetXchange Logo" 
                  className="h-16 w-auto"
                />
              </div>
              <h1 className="text-2xl font-bold" style={{ color: '#0A1C3F' }}>
                Welcome Back
              </h1>
              <p className="text-sm mt-2" style={{ color: '#6E6E6E' }}>
                Africa's Largest Freight Hub
              </p>
            </div>

            {/* Login Form */}
            <Card className="shadow-xl border-0 overflow-hidden">
              <CardHeader className="text-center pb-4" style={{ backgroundColor: '#0A1C3F' }}>
                <CardTitle className="text-xl text-white">Sign In</CardTitle>
                <CardDescription className="text-blue-100">
                  Access your FleetXchange portal
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium" style={{ color: '#0A1C3F' }}>
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 border-2 focus:border-green-500 rounded-lg"
                      style={{ borderColor: '#6E6E6E' }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium" style={{ color: '#0A1C3F' }}>
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 border-2 focus:border-green-500 rounded-lg"
                      style={{ borderColor: '#6E6E6E' }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Link 
                      to="/forgot-password" 
                      className="text-sm hover:underline transition-colors"
                      style={{ color: '#33A852' }}
                    >
                      Forgot your password?
                    </Link>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="animate-in fade-in duration-300">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg transform hover:-translate-y-0.5" 
                    style={{ backgroundColor: '#33A852' }}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm" style={{ color: '#6E6E6E' }}>
                    Don't have an account?
                  </p>
                  <Link to="/register">
                    <Button 
                      variant="outline" 
                      className="w-full h-12 mt-2 border-2 font-semibold rounded-lg transition-all duration-300 hover:shadow-md"
                      style={{ borderColor: '#0A1C3F', color: '#0A1C3F' }}
                    >
                      Create New Account
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Demo Accounts */}
            <Card className="shadow-lg border-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center" style={{ color: '#0A1C3F' }}>
                  <Shield className="mr-2 h-4 w-4" />
                  Demo Accounts
                </CardTitle>
                <CardDescription className="text-xs" style={{ color: '#6E6E6E' }}>
                  Click to use demo credentials (any password works)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {demoAccounts.map((account) => (
                    <div
                      key={account.type}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${account.bgColor} border border-gray-200 hover:shadow-md`}
                      onClick={() => setEmail(account.email)}
                    >
                      <div className="flex items-center space-x-3">
                        <account.icon className={`h-5 w-5 ${account.color}`} />
                        <div>
                          <span className="text-sm font-medium" style={{ color: '#0A1C3F' }}>{account.type}</span>
                          <p className="text-xs" style={{ color: '#6E6E6E' }}>{account.email}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Hero/Info Panel */}
        <div className="hidden lg:flex flex-1 relative overflow-hidden" style={{ backgroundColor: '#0A1C3F' }}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10">
              <Container className="h-16 w-16 text-white" />
            </div>
            <div className="absolute top-32 right-20">
              <Truck className="h-20 w-20 text-white" />
            </div>
            <div className="absolute bottom-32 left-20">
              <MapPin className="h-12 w-12 text-white" />
            </div>
            <div className="absolute bottom-10 right-10">
              <Container className="h-14 w-14 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center p-12 z-10 animate-in fade-in slide-in-from-right-5 duration-700 delay-300">
            <div className="max-w-lg">
              <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                Africa's Smart Logistics Marketplace
              </h2>
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                FleetXchange is Africa's smart logistics marketplace. We connect verified clients and transporters, enabling seamless load posting, bidding, and document verification — all in one platform.
              </p>

              {/* Value Propositions */}
              <div className="space-y-6">
                <div className="flex items-center space-x-4 group">
                  <div className="p-3 rounded-full transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#33A852' }}>
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Verified Clients & Transporters</h3>
                    <p className="text-blue-200 text-sm">Complete document verification and background checks</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 group">
                  <div className="p-3 rounded-full transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#33A852' }}>
                    <Truck className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Smart Load Matching</h3>
                    <p className="text-blue-200 text-sm">AI-powered matching system for optimal load assignments</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 group">
                  <div className="p-3 rounded-full transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: '#33A852' }}>
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Secure Transactions</h3>
                    <p className="text-blue-200 text-sm">End-to-end encrypted payments and secure communications</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">10K+</div>
                  <div className="text-sm text-blue-200">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">50K+</div>
                  <div className="text-sm text-blue-200">Loads Delivered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">25+</div>
                  <div className="text-sm text-blue-200">Countries</div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-5" style={{ backgroundColor: '#33A852' }}></div>
          <div className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-5" style={{ backgroundColor: '#33A852' }}></div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 p-4 text-center">
        <p className="text-sm" style={{ color: '#6E6E6E' }}>
          © FleetXchange 2025 – All Rights Reserved
        </p>
      </footer>
    </div>
  );
}