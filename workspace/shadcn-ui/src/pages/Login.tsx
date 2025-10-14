import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Truck, Shield, MapPin, ArrowRight } from 'lucide-react';
import { authService, User } from '@/lib/auth';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('=== LOGIN FORM SUBMISSION ===');
    console.log('Event:', e);
    console.log('Form email:', email);
    console.log('Form password:', password);
    console.log('Password length:', password.length);
    console.log('Email trimmed:', email.trim());
    
    setLoading(true);
    setError('');

    try {
      // Validate inputs
      if (!email || !password) {
        console.log('❌ Validation failed: Missing email or password');
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }

      console.log('✅ Form validation passed');
      console.log('Calling authService.login...');
      
      // Attempt login
      const user = await authService.login(email.trim(), password);
      
      console.log('Login result:', user);

      if (user) {
        console.log('✅ Login successful!');
        console.log('User type:', user.userType);
        console.log('User status:', user.status);
        console.log('Calling onLogin callback...');
        
        // Call the onLogin callback to update App state
        onLogin(user);
        
        // Navigate to dashboard - no reload needed, React Router handles this
        console.log('🔄 Navigating to dashboard...');
        navigate('/dashboard', { replace: true });
      } else {
        console.log('❌ Login failed: Invalid credentials');
        setError('Invalid email or password. Please check your credentials and try again.');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Debug function to test admin credentials
  const testAdminLogin = () => {
    console.log('=== TESTING ADMIN CREDENTIALS ===');
    setEmail('mrtiger@fleetxchange.africa');
    setPassword('FleetX2025!');
    console.log('Admin credentials set in form');
  };

  const testClientLogin = () => {
    console.log('=== TESTING CLIENT CREDENTIALS ===');
    setEmail('client1@example.com');
    setPassword('Client123!');
    console.log('Client credentials set in form');
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
                  src="/logo.png" 
                  alt="FleetXchange Logo" 
                  className="h-16 sm:h-20 w-auto"
                  onError={(e) => {
                    console.log('Primary logo failed, trying fallback paths');
                    const img = e.currentTarget;
                    if (img.src.includes('/logo.png')) {
                      img.src = '/uploads/Main logo.png';
                    } else if (img.src.includes('/uploads/Main logo.png')) {
                      img.src = '/assets/logo.png';
                    } else {
                      console.log('All logo paths failed, hiding image');
                      img.style.display = 'none';
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: '#0A1C3F' }}>Welcome Back</h2>
                <p className="text-lg font-medium" style={{ color: '#33A852' }}>Africa's Largest Freight Hub</p>
                <p className="text-sm sm:text-base" style={{ color: '#6E6E6E' }}>Sign in to your FleetXchange account</p>
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

                {/* Register Section */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="text-center space-y-3">
                    <p className="text-sm text-gray-600">Don't have an account?</p>
                    <div className="space-y-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/register/client')}
                        className="w-full"
                      >
                        Register as Client
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/register/transporter')}
                        className="w-full"
                      >
                        Register as Transporter
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Choose your role to get started with FleetXchange
                    </p>
                  </div>
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