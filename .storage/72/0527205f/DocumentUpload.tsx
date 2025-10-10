import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import { authService, User, Document, REQUIRED_DOCUMENTS } from '@/lib/auth';

export default function DocumentUpload() {
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setDocuments(authService.getUserDocuments(currentUser.id));
    }
  }, []);

  const handleFileUpload = async (documentType: string, file: File) => {
    if (!user) return;

    setUploading(documentType);
    
    // Simulate file upload
    setTimeout(() => {
      const document = authService.uploadDocument({
        userId: user.id,
        documentType,
        fileName: file.name,
        fileUrl: URL.createObjectURL(file),
        verificationStatus: 'pending'
      });
      
      setDocuments([...documents, document]);
      setUploading(null);
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'more_info_required':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      approved: "default",
      pending: "secondary",
      rejected: "destructive",
      more_info_required: "outline"
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace('_', ' ')}</Badge>;
  };

  const getDocumentStatus = (docType: string) => {
    return documents.find(doc => doc.documentType === docType);
  };

  const getCompletionPercentage = () => {
    if (!user || user.userType === 'admin') return 0;
    const requiredDocs = REQUIRED_DOCUMENTS[user.userType] || [];
    const uploadedDocs = documents.filter(doc => doc.verificationStatus === 'approved').length;
    return Math.round((uploadedDocs / requiredDocs.length) * 100);
  };

  if (!user || user.userType === 'admin') {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500 text-center">Document upload not available for admin users</p>
        </CardContent>
      </Card>
    );
  }

  const requiredDocs = REQUIRED_DOCUMENTS[user.userType] || [];
  const completionPercentage = getCompletionPercentage();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <FileText className="mr-2 h-5 w-5" />
            Document Verification Progress
          </CardTitle>
          <CardDescription className="text-blue-600">
            Complete your document verification to activate your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Progress</span>
              <span className="font-medium text-blue-800">{completionPercentage}% Complete</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <div className="text-lg font-bold text-blue-600">{documents.length}</div>
                <div className="text-xs text-blue-500">Uploaded</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <div className="text-lg font-bold text-green-600">
                  {documents.filter(d => d.verificationStatus === 'approved').length}
                </div>
                <div className="text-xs text-green-500">Approved</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <div className="text-lg font-bold text-yellow-600">
                  {documents.filter(d => d.verificationStatus === 'pending').length}
                </div>
                <div className="text-xs text-yellow-500">Pending</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <div className="text-lg font-bold text-red-600">
                  {documents.filter(d => d.verificationStatus === 'rejected').length}
                </div>
                <div className="text-xs text-red-500">Rejected</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Grid */}
      <div className="grid gap-4">
        {requiredDocs.map((docType) => {
          const existingDoc = getDocumentStatus(docType);
          const isUploading = uploading === docType;
          
          return (
            <Card key={docType} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{docType}</h3>
                      {existingDoc && (
                        <div className="flex items-center space-x-2 mt-1">
                          {getStatusIcon(existingDoc.verificationStatus)}
                          <span className="text-sm text-gray-600">{existingDoc.fileName}</span>
                        </div>
                      )}
                      {existingDoc?.adminNotes && (
                        <Alert className="mt-2 border-orange-200 bg-orange-50">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm text-orange-800">
                            Admin Note: {existingDoc.adminNotes}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {existingDoc && (
                      <>
                        {getStatusBadge(existingDoc.verificationStatus)}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(existingDoc.fileUrl, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(docType, file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isUploading}
                      />
                      <Button
                        size="sm"
                        disabled={isUploading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600"
                      >
                        {isUploading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            {existingDoc ? 'Replace' : 'Upload'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Instructions */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm">Upload Requirements</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>• Accepted formats: PDF, JPG, PNG, DOC, DOCX</p>
          <p>• Maximum file size: 10MB per document</p>
          <p>• All documents must be clear and legible</p>
          <p>• Documents will be reviewed within 2-3 business days</p>
          <p>• You will be notified via email once verification is complete</p>
        </CardContent>
      </Card>
    </div>
  );
}