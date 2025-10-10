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
import { Upload, FileText, Eye, CheckCircle, XCircle, AlertCircle, Download, Clock } from 'lucide-react';
import { authService, Document } from '@/lib/auth';

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
    }
  }, [currentUser]);

  const loadDocuments = () => {
    if (currentUser) {
      const userDocs = authService.getUserDocuments(currentUser.id);
      setDocuments(userDocs);
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
      // Simulate file upload - In production, this would upload to cloud storage
      const fileUrl = URL.createObjectURL(selectedFile);
      
      const document = authService.uploadDocument({
        userId: currentUser.id,
        fileName: selectedFile.name,
        fileUrl: fileUrl,
        documentType: documentType
      });

      setDocuments([...documents, document]);
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
      pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { variant: 'default' as const, color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', icon: XCircle },
      more_info_required: { variant: 'outline' as const, color: 'bg-orange-100 text-orange-800', icon: AlertCircle }
    };

    const config = configs[status as keyof typeof configs] || configs.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const handleViewDocument = (document: Document) => {
    // In production, this would open the document in a new tab or modal
    window.open(document.fileUrl, '_blank');
  };

  const handleDownloadDocument = (document: Document) => {
    // Create download link
    const link = document.createElement('a');
    link.href = document.fileUrl;
    link.download = document.fileName;
    link.click();
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
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !documentType}
                  className="text-white"
                  style={{ backgroundColor: '#33A852' }}
                >
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </Button>
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
                          onClick={() => handleViewDocument(doc)}
                          title="View Document"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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