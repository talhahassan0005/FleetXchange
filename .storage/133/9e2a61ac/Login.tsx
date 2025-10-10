import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authService } from '@/lib/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== LOGIN FORM SUBMISSION ===');
    console.log('Form email:', email);
    console.log('Form password:', password);
    console.log('Email length:', email.length);
    console.log('Password length:', password.length);
    
    setIsLoading(true);
    setError('');

    try {
      // Validate inputs
      if (!email || !password) {
        console.log('❌ Validation failed: Missing email or password');
        setError('Please enter both email and password');
        setIsLoading(false);
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
        console.log('Navigating to dashboard...');
        
        // Navigate based on user type
        if (user.userType === 'admin') {
          console.log('Redirecting to admin dashboard');
          navigate('/admin');
        } else if (user.userType === 'client') {
          console.log('Redirecting to client dashboard');
          navigate('/client');
        } else if (user.userType === 'transporter') {
          console.log('Redirecting to transporter dashboard');
          navigate('/transporter');
        }
      } else {
        console.log('❌ Login failed: Invalid credentials');
        setError('Invalid email or password. Please check your credentials and try again.');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Debug function to test admin credentials
  const testAdminLogin = () => {
    console.log('=== TESTING ADMIN CREDENTIALS ===');
    setEmail('mrtiger@fleetxchange.africa');
    setPassword('FleetX2025!');
    console.log('Admin credentials set in form');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <img 
            src="/uploads/Main logo.png" 
            alt="FleetXchange Logo" 
            className="h-16 mx-auto mb-4"
            onError={(e) => {
              console.log('Logo failed to load, using fallback');
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your FleetXchange account</p>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full"
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
                  className="w-full"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            {/* Debug Section - Remove in production */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Debug Tools</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={testAdminLogin}
                className="w-full mb-2"
              >
                Fill Admin Credentials
              </Button>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>Admin Email:</strong> mrtiger@fleetxchange.africa</p>
                <p><strong>Admin Password:</strong> FleetX2025!</p>
                <p className="text-blue-600">Check browser console (F12) for detailed logs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>© 2025 FleetXchange Africa. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}