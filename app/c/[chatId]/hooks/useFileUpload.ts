import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface UploadedFile {
  name: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
  url?: string;
  error?: string;
  documentId?: string;
  prismaId?: string;
  firestoreId?: string;
  abortController?: AbortController;
}

export function useFileUpload(userId?: string) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleFileUpload = useCallback((file: UploadedFile) => {
    setUploadedFiles(prev => {
      const existingIndex = prev.findIndex(f => f.name === file.name);
      if (existingIndex >= 0) {
        // Update existing file
        const updated = [...prev];
        updated[existingIndex] = file;
        return updated;
      } else {
        // Add new file
        return [...prev, file];
      }
    });
  }, []);

  // Handle file removal with backend cleanup
  const handleFileRemove = useCallback(async (index: number) => {
    const fileToRemove = uploadedFiles[index];
    if (!fileToRemove) return;

    // Remove from UI immediately
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));

    try {
      // Cancel ongoing upload/processing if it exists
      if (fileToRemove.abortController) {
        fileToRemove.abortController.abort();
      }

      // Delete from backend if the file was successfully uploaded
      if (fileToRemove.status === 'done' && fileToRemove.prismaId && userId) {
        
        await axios.delete('/api/documents/delete', {
          params: {
            userId: userId,
            documentId: fileToRemove.prismaId,
          },
        });
        
        console.info('🟦 [file_removal][SUCCESS] File deleted from backend:', fileToRemove.name);
        toast.success(`File "${fileToRemove.name}" removed successfully`);
      } else if (fileToRemove.status === 'uploading') {
        toast.info(`Upload cancelled for "${fileToRemove.name}"`);
      } else {
        toast.info(`File "${fileToRemove.name}" removed from list`);
      }
    } catch (error: any) {
      console.error('🟥 [file_removal][ERROR] Failed to delete file from backend:', error);
      
      // Still show success since file is removed from UI
      // Backend cleanup can be handled later if needed
      if (fileToRemove.status === 'done') {
        toast.warning(`File removed from list but may need manual cleanup`);
      }
    }
  }, [uploadedFiles, userId]);

  return {
    uploadedFiles,
    handleFileUpload,
    handleFileRemove
  };
} 