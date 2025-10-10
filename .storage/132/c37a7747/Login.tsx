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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-white">
          <div className="w-full max-w-md space-y-6 sm:space-y-8">
            {/* Logo and Branding */}
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4 sm:mb-6">
                <img 
                  src="/assets/fleetxchange-logo.png" 
                  alt="FleetXchange Logo" 
                  className="h-16 sm:h-20 w-auto"
                />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: '#0A1C3F' }}>Welcome Back</h2>
                <p className="text-lg font-medium" style={{ color: '#33A852' }}>Africa's Largest Freight Hub</p>
                <p className="text-sm sm:text-base" style={{ color: '#6E6E6E' }}>Sign in to your account to continue</p>
              </div>
            </div>

            {/* Login Form */}
            <Card className="shadow-xl border-0 bg-white rounded-2xl">
              <CardHeader className="space-y-1 pb-4" style={{ backgroundColor: '#0A1C3F' }}>
                <CardTitle className="text-lg sm:text-xl text-white">Sign In</CardTitle>
                <CardDescription className="text-blue-100 text-sm">
                  Enter your credentials to access your portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-medium text-sm" style={{ color: '#0A1C3F' }}>Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-10 sm:h-12 border-2 border-gray-200 rounded-xl transition-colors text-sm sm:text-base"
                      style={{ '--tw-ring-color': '#33A852' } as React.CSSProperties}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="font-medium text-sm" style={{ color: '#0A1C3F' }}>Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 sm:h-12 border-2 border-gray-200 rounded-xl transition-colors text-sm sm:text-base"
                      style={{ '--tw-ring-color': '#33A852' } as React.CSSProperties}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Link 
                      to="/forgot-password" 
                      className="text-xs sm:text-sm font-medium transition-colors hover:underline"
                      style={{ color: '#33A852' }}
                    >
                      Forgot Password?
                    </Link>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="rounded-xl">
                      <AlertDescription className="text-sm">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-10 sm:h-12 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 text-sm sm:text-base" 
                    style={{ backgroundColor: '#33A852' }}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />}
                    Sign In
                    {!loading && <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />}
                  </Button>
                </form>

                <div className="text-center">
                  <p className="text-xs sm:text-sm mb-4" style={{ color: '#6E6E6E' }}>Don't have an account?</p>
                  <Link to="/register">
                    <Button 
                      variant="outline" 
                      className="w-full h-10 sm:h-12 border-2 font-semibold rounded-xl transition-all duration-300 text-sm sm:text-base"
                      style={{ borderColor: '#0A1C3F', color: '#0A1C3F' }}
                    >
                      Create New Account
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side - Hero/Info Panel */}
        <div className="flex-1 p-4 sm:p-8 flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#0A1C3F' }}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 sm:top-20 left-10 sm:left-20">
              <Truck className="h-16 w-16 sm:h-32 sm:w-32 text-white transform rotate-12" />
            </div>
            <div className="absolute bottom-16 sm:bottom-32 right-10 sm:right-20">
              <MapPin className="h-12 w-12 sm:h-24 sm:w-24 text-white transform -rotate-12" />
            </div>
            <div className="absolute top-1/2 left-1/4">
              <div className="w-8 h-8 sm:w-16 sm:h-16 border-4 border-white rounded-full" />
            </div>
            <div className="absolute bottom-1/4 left-1/2">
              <div className="w-6 h-6 sm:w-12 sm:h-12 bg-white rounded-full opacity-50" />
            </div>
          </div>

          <div className="relative z-10 text-white max-w-lg space-y-6 sm:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-2xl sm:text-4xl font-bold leading-tight">
                Welcome to Africa's Smart Logistics Marketplace
              </h2>
              <p className="text-base sm:text-xl text-gray-200 leading-relaxed">
                FleetXchange is Africa's smart logistics marketplace. We connect verified clients and transporters, 
                enabling seamless load posting, bidding, and document verification — all in one platform.
              </p>
            </div>

            {/* Value Propositions */}
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white/10 backdrop-blur-sm rounded-xl">
                <div className="p-1.5 sm:p-2 rounded-lg" style={{ backgroundColor: '#33A852' }}>
                  <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Verified Clients & Transporters</h3>
                  <p className="text-xs sm:text-sm text-gray-200">Complete document verification and background checks</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white/10 backdrop-blur-sm rounded-xl">
                <div className="p-1.5 sm:p-2 rounded-lg" style={{ backgroundColor: '#33A852' }}>
                  <Truck className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Smart Load Matching</h3>
                  <p className="text-xs sm:text-sm text-gray-200">AI-powered matching system for optimal load assignments</p>
                </div>
              </div>

              <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-white/10 backdrop-blur-sm rounded-xl">
                <div className="p-1.5 sm:p-2 rounded-lg" style={{ backgroundColor: '#33A852' }}>
                  <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Secure Transactions</h3>
                  <p className="text-xs sm:text-sm text-gray-200">End-to-end encrypted payments and secure communications</p>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-white/20">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold" style={{ color: '#33A852' }}>Ready</div>
                <div className="text-xs sm:text-sm text-gray-200">For Launch</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold" style={{ color: '#33A852' }}>100%</div>
                <div className="text-xs sm:text-sm text-gray-200">Production Ready</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold" style={{ color: '#33A852' }}>Live</div>
                <div className="text-xs sm:text-sm text-gray-200">System Status</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Fixed at bottom */}
      <footer className="bg-white border-t border-gray-200 py-3 sm:py-4">
        <div className="text-center text-xs sm:text-sm" style={{ color: '#6E6E6E' }}>
          © FleetXchange 2025 – Production Environment – All Rights Reserved
        </div>
      </footer>
    </div>
  );
}