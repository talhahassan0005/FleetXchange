import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Users, Building2 } from 'lucide-react';
import { authService } from '@/lib/auth';

export default function FormsDownload() {
  const currentUser = authService.getCurrentUser();

  const handleDownload = (fileName: string, displayName: string) => {
    const link = document.createElement('a');
    link.href = `/assets/${fileName}`;
    link.download = displayName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clientForms = [
    {
      id: 'client-onboarding',
      title: 'Client Onboarding Form',
      description: 'Complete this form to register as a client on FleetXchange',
      fileName: 'FleetXchange Client Onboarding Form.pdf',
      icon: FileText,
      category: 'Onboarding'
    }
  ];

  const transporterForms = [
    {
      id: 'transporter-onboarding',
      title: 'Transporter Onboarding Form',
      description: 'Complete this form to register as a transporter on FleetXchange',
      fileName: 'FleetXchange Transporter Onboarding Form.pdf',
      icon: FileText,
      category: 'Onboarding'
    }
  ];

  const kycForms = [
    {
      id: 'kyc-individual',
      title: 'KYC Form - Individual',
      description: 'Know Your Customer form for individual applicants',
      fileName: 'Know Your Customer Form Individual 2025.pdf',
      icon: Users,
      category: 'KYC'
    },
    {
      id: 'kyc-company',
      title: 'KYC Form - Company',
      description: 'Know Your Customer form for company/business applicants',
      fileName: 'Know Your Customer Form Non Individual 2025.pdf',
      icon: Building2,
      category: 'KYC'
    }
  ];

  if (!currentUser) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: '#6E6E6E' }} />
          <p style={{ color: '#6E6E6E' }}>Please log in to access downloadable forms</p>
        </CardContent>
      </Card>
    );
  }

  const getRelevantForms = () => {
    const forms = [...kycForms]; // KYC forms are available to all users
    
    if (currentUser.userType === 'client') {
      forms.unshift(...clientForms);
    } else if (currentUser.userType === 'transporter') {
      forms.unshift(...transporterForms);
    } else if (currentUser.userType === 'admin') {
      // Admin can access all forms
      forms.unshift(...clientForms, ...transporterForms);
    }
    
    return forms;
  };

  const relevantForms = getRelevantForms();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
            <Download className="mr-2 h-5 w-5" />
            Forms for Download
          </CardTitle>
          <CardDescription>
            Download the required forms for registration and KYC compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relevantForms.map((form) => {
              const Icon = form.icon;
              return (
                <Card key={form.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <Icon className="h-5 w-5" style={{ color: '#0A1C3F' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-sm" style={{ color: '#0A1C3F' }}>
                            {form.title}
                          </h3>
                          <span 
                            className="px-2 py-1 text-xs rounded-full"
                            style={{ 
                              backgroundColor: form.category === 'KYC' ? '#33A852' : '#0A1C3F',
                              color: 'white'
                            }}
                          >
                            {form.category}
                          </span>
                        </div>
                        <p className="text-sm mb-3" style={{ color: '#6E6E6E' }}>
                          {form.description}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(form.fileName, form.title + '.pdf')}
                          className="w-full text-white"
                          style={{ backgroundColor: '#33A852' }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {relevantForms.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: '#6E6E6E' }} />
              <p style={{ color: '#6E6E6E' }}>No forms available for download</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
            <FileText className="mr-2 h-5 w-5" />
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium mb-2" style={{ color: '#0A1C3F' }}>Onboarding Forms</h4>
              <p className="text-sm" style={{ color: '#6E6E6E' }}>
                Complete the appropriate onboarding form based on your user type (Client or Transporter). 
                This form contains essential information about your business and requirements.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium mb-2" style={{ color: '#0A1C3F' }}>KYC Forms</h4>
              <p className="text-sm" style={{ color: '#6E6E6E' }}>
                All users must complete the appropriate Know Your Customer (KYC) form:
              </p>
              <ul className="text-sm mt-2 space-y-1" style={{ color: '#6E6E6E' }}>
                <li>• <strong>Individual Form:</strong> For sole proprietors and individual applicants</li>
                <li>• <strong>Company Form:</strong> For registered businesses and corporations</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium mb-2" style={{ color: '#0A1C3F' }}>Submission Process</h4>
              <p className="text-sm" style={{ color: '#6E6E6E' }}>
                After completing the forms, upload them through the Documents section of your portal 
                for verification by our team. Ensure all information is accurate and complete.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}