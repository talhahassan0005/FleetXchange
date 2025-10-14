import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Download, Clock } from 'lucide-react';
import { authService, Document } from '@/lib/auth';
import { api } from '@/lib/api';
import { websocketService } from '@/lib/websocket';

export default function DocumentUpload() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (currentUser) {
      loadDocuments();

      // Connect websocket (no-op if already connected) and listen for document events
      try {
        websocketService.connect();
      } catch (e) {
        console.error('Websocket connect failed:', e);
      }

      // Listen for auth login events so this component can react immediately
      const handleAuthLogin = (e: any) => {
        try {
          const user = e?.detail?.user;
          if (user && user.id === currentUser.id) {
            console.log('🔔 [DOCUMENT_UPLOAD] auth:login event received for current user, reloading documents');
            loadDocuments();
          }
        } catch (err) {
          console.error('Error handling auth:login event:', err);
        }
      };
      window.addEventListener('auth:login', handleAuthLogin as EventListener);

      const handleUploaded = (payload: any) => {
        try {
          // server emits document_uploaded_success targeted to the uploader
          if (payload?.document?.userId && payload.document.userId === currentUser.id) {
            console.log('🔔 [DOCUMENT_UPLOAD] Received document_uploaded_success, reloading documents');
            loadDocuments();
          }
        } catch (err) {
          console.error('Error handling document_uploaded_success:', err);
        }
      };

      const handleVerified = (payload: any) => {
        try {
          if (payload?.document?.userId && payload.document.userId === currentUser.id) {
            console.log('🔔 [DOCUMENT_UPLOAD] Received document_verified, reloading documents');
            loadDocuments();
          }
        } catch (err) {
          console.error('Error handling document_verified:', err);
        }
      };

      // Listen for cross-component refresh events (safe, non-invasive)
      const handleExternalRefresh = (e: Event) => {
        try {
          console.log('🔔 [DOCUMENT_UPLOAD] Received external documents:refresh event, reloading documents');
          loadDocuments();
        } catch (err) {
          console.error('Error handling external documents:refresh event:', err);
        }
      };

      window.addEventListener('documents:refresh', handleExternalRefresh);

  websocketService.on('document_uploaded_success', handleUploaded);
  websocketService.on('document_verified', handleVerified);

      // Auto-refresh documents every 30 seconds as a fallback
      const interval = setInterval(() => {
        loadDocuments();
      }, 30000);

      return () => {
        clearInterval(interval);
        websocketService.off('document_uploaded_success', handleUploaded);
        websocketService.off('document_verified', handleVerified);
        window.removeEventListener('documents:refresh', handleExternalRefresh);
      };
    }
  }, [currentUser]);

  const loadDocuments = async () => {
    if (currentUser) {
      try {
        console.log('🔍 [DOCUMENT_UPLOAD] loadDocuments() start for user', currentUser.id);
        // Load documents with pagination for better performance
        const userDocs = await api.documents.getByUser(currentUser.id, { page: 1, limit: 20 });
        setDocuments(userDocs);
        console.log(`🔍 [DOCUMENT_UPLOAD] loadDocuments() finished, got ${userDocs.length} documents`);
      } catch (error) {
        console.error('Failed to load documents:', error);
        // Fallback to empty array
        setDocuments([]);
      }
    }
  };

  const documentTypes = [
    'Business Registration Certificate',
    'Tax Clearance Certificate',
    'Insurance Certificate',
    'Driver\'s License',
    'Vehicle Registration',
    'Operating License',
    'Bank Statement',
    'Company Profile',
    'Other'
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PDF, JPEG, and PNG files are allowed');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType || !currentUser) {
      alert('Please select a file and document type');
      return;
    }

    setUploading(true);
    setUploadSuccess(false);

    try {
      // Upload file to backend
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('documentType', documentType);

      console.log('=== DOCUMENT UPLOAD START ===');
      console.log('User:', currentUser.email);
      console.log('File:', selectedFile.name, selectedFile.size);
      console.log('Document Type:', documentType);
      console.log('Sending upload request...');

      const response = await api.upload.single(selectedFile, documentType);
      console.log('Upload response:', response);
      
      // Add the new document to the list
      const newDocument: Document = {
        id: response.document.id,
        userId: currentUser.id,
        fileName: response.document.fileName,
        fileUrl: response.document.fileUrl,
        documentType: response.document.documentType,
        verificationStatus: response.document.verificationStatus,
        uploadedAt: response.document.uploadedAt,
        verifiedAt: response.document.verifiedAt
      };

      // Optimistically add the new document to the UI immediately
      setDocuments(prev => [newDocument, ...prev.filter(d => d.id !== newDocument.id)]);

      // Reload documents from server to get the canonical latest list (fallback)
      await loadDocuments();
      
      setSelectedFile(null);
      setDocumentType('');
      setUploadSuccess(true);
      
      // Reset form
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      PENDING: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      APPROVED: { variant: 'default' as const, color: 'bg-green-100 text-green-800', icon: CheckCircle },
      REJECTED: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', icon: XCircle },
      MORE_INFO_REQUIRED: { variant: 'outline' as const, color: 'bg-orange-100 text-orange-800', icon: AlertCircle }
    };

    const config = configs[status as keyof typeof configs] || configs.PENDING;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const handleViewDocument = async (document: Document) => {
    try {
      // Extract filename from fileUrl
      const filename = document.fileUrl.split('/').pop();
      if (!filename) {
        throw new Error('Invalid file URL');
      }
      
      // Construct download URL using the backend download endpoint
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const downloadUrl = `${baseUrl}/api/upload/download/${filename}`;
      
      console.log('Downloading document:', { 
        fileName: document.fileName, 
        filename,
        downloadUrl 
      });
      
      // Create a temporary anchor element to trigger download
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      toast.success('Document download started', {
        description: document.fileName,
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to download document:', error);
      toast.error('Failed to download document', {
        description: 'Please check if the file exists or contact support.',
        duration: 5000,
      });
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      // Get the file from backend
      const fileBlob = await api.upload.downloadFile(document.fileUrl.split('/').pop() || '');
      
      // Create download link
      const url = URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download document:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  if (!currentUser) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Please log in to access document management.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
            <Upload className="mr-2 h-5 w-5" />
            Document Upload
          </CardTitle>
          <CardDescription>
            Upload required business documents for verification. Accepted formats: PDF, JPEG, PNG (Max 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadSuccess && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Document uploaded successfully! It will be reviewed by our team.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>
          </div>

          {selectedFile && (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" style={{ color: '#6E6E6E' }} />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm" style={{ color: '#6E6E6E' }}>
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Button
                    onClick={handleUpload}
                    disabled={uploading || !documentType || !selectedFile}
                    className="text-white"
                    style={{ backgroundColor: '#33A852' }}
                  >
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </Button>
                  <div className="text-xs text-gray-500">
                    {!documentType && 'Please select document type'}
                    {!selectedFile && 'Please select a file'}
                    {documentType && selectedFile && 'Ready to upload'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
            <FileText className="mr-2 h-5 w-5" />
            My Documents
          </CardTitle>
          <CardDescription>
            View and manage your uploaded documents and their verification status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4" style={{ color: '#6E6E6E' }} />
              <p style={{ color: '#6E6E6E' }}>No documents uploaded yet</p>
              <p className="text-sm" style={{ color: '#6E6E6E' }}>
                Upload your business documents to get verified
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" style={{ color: '#6E6E6E' }} />
                        <span className="font-medium">{doc.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell>{doc.documentType}</TableCell>
                    <TableCell>{getStatusBadge(doc.verificationStatus)}</TableCell>
                    <TableCell>
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadDocument(doc)}
                          title="Download Document"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {documents.some(doc => doc.verificationStatus === 'rejected' || doc.verificationStatus === 'more_info_required') && (
            <Alert className="mt-4 border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Some documents require attention. Please check the admin notes and re-upload if necessary.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Document Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center" style={{ color: '#0A1C3F' }}>
            <CheckCircle className="mr-2 h-5 w-5" />
            Required Documents
          </CardTitle>
          <CardDescription>
            Ensure you have uploaded all required documents for account verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentUser.userType === 'client' && (
              <>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2" style={{ color: '#0A1C3F' }}>Business Registration</h4>
                  <p className="text-sm" style={{ color: '#6E6E6E' }}>
                    Valid business registration certificate
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2" style={{ color: '#0A1C3F' }}>Tax Clearance</h4>
                  <p className="text-sm" style={{ color: '#6E6E6E' }}>
                    Current tax clearance certificate
                  </p>
                </div>
              </>
            )}
            
            {currentUser.userType === 'transporter' && (
              <>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2" style={{ color: '#0A1C3F' }}>Operating License</h4>
                  <p className="text-sm" style={{ color: '#6E6E6E' }}>
                    Valid transport operating license
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2" style={{ color: '#0A1C3F' }}>Insurance Certificate</h4>
                  <p className="text-sm" style={{ color: '#6E6E6E' }}>
                    Comprehensive vehicle insurance
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2" style={{ color: '#0A1C3F' }}>Vehicle Registration</h4>
                  <p className="text-sm" style={{ color: '#6E6E6E' }}>
                    Vehicle registration documents
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2" style={{ color: '#0A1C3F' }}>Driver's License</h4>
                  <p className="text-sm" style={{ color: '#6E6E6E' }}>
                    Valid professional driving license
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}