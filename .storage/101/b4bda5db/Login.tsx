import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Truck, Shield, Users, MapPin, ArrowRight } from 'lucide-react';
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

  const productionAccounts = [
    { type: 'Admin', email: 'mrtiger@fleetxchange.africa', icon: Shield, color: 'text-red-600', description: 'System Administrator' },
    { type: 'Admin', email: 'tshepiso@fleetxchange.africa', icon: Shield, color: 'text-red-600', description: 'System Administrator' }
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Branding */}
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-6">
              <img 
                src="/assets/fleetxchange-logo.png" 
                alt="FleetXchange Logo" 
                className="h-20 w-auto"
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold" style={{ color: '#0A1C3F' }}>Welcome Back</h2>
              <p className="text-lg font-medium" style={{ color: '#33A852' }}>Africa's Largest Freight Hub</p>
              <p style={{ color: '#6E6E6E' }}>Sign in to your account to continue</p>
            </div>
          </div>

          {/* Login Form */}
          <Card className="shadow-xl border-0 bg-white rounded-2xl">
            <CardHeader className="space-y-1 pb-4" style={{ backgroundColor: '#0A1C3F' }}>
              <CardTitle className="text-xl text-white">Sign In</CardTitle>
              <CardDescription className="text-blue-100">
                Enter your credentials to access your portal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="font-medium" style={{ color: '#0A1C3F' }}>Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 border-2 border-gray-200 rounded-xl transition-colors"
                    style={{ '--tw-ring-color': '#33A852' } as React.CSSProperties}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="font-medium" style={{ color: '#0A1C3F' }}>Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 border-2 border-gray-200 rounded-xl transition-colors"
                    style={{ '--tw-ring-color': '#33A852' } as React.CSSProperties}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Link 
                    to="/forgot-password" 
                    className="text-sm font-medium transition-colors hover:underline"
                    style={{ color: '#33A852' }}
                  >
                    Forgot Password?
                  </Link>
                </div>

                {error && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105" 
                  style={{ backgroundColor: '#33A852' }}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Sign In
                  {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </form>

              <div className="text-center">
                <p className="text-sm mb-4" style={{ color: '#6E6E6E' }}>Don't have an account?</p>
                <Link to="/register">
                  <Button 
                    variant="outline" 
                    className="w-full h-12 border-2 font-semibold rounded-xl transition-all duration-300"
                    style={{ borderColor: '#0A1C3F', color: '#0A1C3F' }}
                  >
                    Create New Account
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Production Admin Accounts */}
          <Card className="shadow-lg border-0 rounded-2xl bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold" style={{ color: '#0A1C3F' }}>Admin Access</CardTitle>
              <CardDescription className="text-xs" style={{ color: '#6E6E6E' }}>
                Production administrator accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {productionAccounts.map((account, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-105 border border-gray-100"
                    onClick={() => setEmail(account.email)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-red-100">
                        <account.icon className={`h-4 w-4 ${account.color}`} />
                      </div>
                      <div>
                        <span className="text-sm font-medium" style={{ color: '#0A1C3F' }}>{account.description}</span>
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
      <div className="flex-1 p-8 flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#0A1C3F' }}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20">
            <Truck className="h-32 w-32 text-white transform rotate-12" />
          </div>
          <div className="absolute bottom-32 right-20">
            <MapPin className="h-24 w-24 text-white transform -rotate-12" />
          </div>
          <div className="absolute top-1/2 left-1/4">
            <div className="w-16 h-16 border-4 border-white rounded-full" />
          </div>
          <div className="absolute bottom-1/4 left-1/2">
            <div className="w-12 h-12 bg-white rounded-full opacity-50" />
          </div>
        </div>

        <div className="relative z-10 text-white max-w-lg space-y-8">
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              Welcome to Africa's Smart Logistics Marketplace
            </h2>
            <p className="text-xl text-gray-200 leading-relaxed">
              FleetXchange is Africa's smart logistics marketplace. We connect verified clients and transporters, 
              enabling seamless load posting, bidding, and document verification — all in one platform.
            </p>
          </div>

          {/* Value Propositions */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#33A852' }}>
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Verified Clients & Transporters</h3>
                <p className="text-sm text-gray-200">Complete document verification and background checks</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#33A852' }}>
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Smart Load Matching</h3>
                <p className="text-sm text-gray-200">AI-powered matching system for optimal load assignments</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#33A852' }}>
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Secure Transactions</h3>
                <p className="text-sm text-gray-200">End-to-end encrypted payments and secure communications</p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/20">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: '#33A852' }}>Ready</div>
              <div className="text-sm text-gray-200">For Launch</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: '#33A852' }}>100%</div>
              <div className="text-sm text-gray-200">Production Ready</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: '#33A852' }}>Live</div>
              <div className="text-sm text-gray-200">System Status</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 py-4">
        <div className="text-center text-sm" style={{ color: '#6E6E6E' }}>
          © FleetXchange 2025 – Production Environment – All Rights Reserved
        </div>
      </div>
    </div>
  );
}