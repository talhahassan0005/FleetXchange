import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, User, Building, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { authService } from '@/lib/auth';

export default function RegisterClient() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    contactPerson: '',
    phone: '',
    address: '',
    businessRegistration: '',
    taxId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate inputs
      if (!formData.email || !formData.password || !formData.companyName || !formData.contactPerson) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }

      // Register client
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        userType: 'CLIENT',
        companyName: formData.companyName,
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        address: formData.address,
        businessRegistration: formData.businessRegistration,
        taxId: formData.taxId
      });

      if (response.success) {
        // Registration successful, redirect to login
        navigate('/login', { 
          state: { 
            message: 'Registration successful! Please check your email for verification.',
            email: formData.email 
          }
        });
      } else {
        setError(response.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('An error occurred during registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo.png" 
              alt="FleetXchange Logo" 
              className="h-8 w-auto"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = 'none';
              }}
            />
            <div>
              <h1 className="text-lg font-bold" style={{ color: '#0A1C3F' }}>FleetXchange</h1>
              <p className="text-xs" style={{ color: '#33A852' }}>Africa's Largest Freight Hub</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/login')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Login</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2" style={{ color: '#0A1C3F' }}>
              Register as Client
            </h2>
            <p className="text-gray-600">
              Join FleetXchange to post loads and find reliable transporters
            </p>
          </div>

          <Card className="shadow-xl border-0 bg-white rounded-2xl">
            <CardHeader className="space-y-1 pb-4" style={{ backgroundColor: '#0A1C3F' }}>
              <CardTitle className="text-xl text-white flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Client Registration
              </CardTitle>
              <CardDescription className="text-blue-100">
                Create your client account to start posting loads
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Account Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center" style={{ color: '#0A1C3F' }}>
                    <User className="h-5 w-5 mr-2" />
                    Account Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="font-medium text-sm" style={{ color: '#0A1C3F' }}>
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="h-12 border-2 border-gray-200 rounded-xl"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="contactPerson" className="font-medium text-sm" style={{ color: '#0A1C3F' }}>
                        Contact Person *
                      </Label>
                      <Input
                        id="contactPerson"
                        name="contactPerson"
                        type="text"
                        placeholder="Your full name"
                        value={formData.contactPerson}
                        onChange={handleInputChange}
                        required
                        className="h-12 border-2 border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="font-medium text-sm" style={{ color: '#0A1C3F' }}>
                        Password *
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Create a password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        className="h-12 border-2 border-gray-200 rounded-xl"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="font-medium text-sm" style={{ color: '#0A1C3F' }}>
                        Confirm Password *
                      </Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        className="h-12 border-2 border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center" style={{ color: '#0A1C3F' }}>
                    <Building className="h-5 w-5 mr-2" />
                    Company Information
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="font-medium text-sm" style={{ color: '#0A1C3F' }}>
                      Company Name *
                    </Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      type="text"
                      placeholder="Your company name"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      required
                      className="h-12 border-2 border-gray-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="font-medium text-sm" style={{ color: '#0A1C3F' }}>
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+27-XX-XXX-XXXX"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="h-12 border-2 border-gray-200 rounded-xl"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="businessRegistration" className="font-medium text-sm" style={{ color: '#0A1C3F' }}>
                        Business Registration
                      </Label>
                      <Input
                        id="businessRegistration"
                        name="businessRegistration"
                        type="text"
                        placeholder="Registration number"
                        value={formData.businessRegistration}
                        onChange={handleInputChange}
                        className="h-12 border-2 border-gray-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="font-medium text-sm" style={{ color: '#0A1C3F' }}>
                      Business Address
                    </Label>
                    <Input
                      id="address"
                      name="address"
                      type="text"
                      placeholder="Your business address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="h-12 border-2 border-gray-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxId" className="font-medium text-sm" style={{ color: '#0A1C3F' }}>
                      Tax ID
                    </Label>
                    <Input
                      id="taxId"
                      name="taxId"
                      type="text"
                      placeholder="Tax identification number"
                      value={formData.taxId}
                      onChange={handleInputChange}
                      className="h-12 border-2 border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105" 
                  style={{ backgroundColor: '#33A852' }}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {loading ? 'Creating Account...' : 'Create Client Account'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button 
                    onClick={() => navigate('/login')}
                    className="font-medium hover:underline"
                    style={{ color: '#33A852' }}
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
