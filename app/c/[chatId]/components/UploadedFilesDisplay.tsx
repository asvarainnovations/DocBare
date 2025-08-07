import clsx from 'clsx';

interface UploadedFile {
  name: string;
  status: 'uploading' | 'done' | 'error';
  url?: string;
  error?: string;
  documentId?: string;
  prismaId?: string;
  firestoreId?: string;
  abortController?: AbortController;
}

interface UploadedFilesDisplayProps {
  uploadedFiles: UploadedFile[];
  onRemoveFile: (index: number) => void;
}

export default function UploadedFilesDisplay({ uploadedFiles, onRemoveFile }: UploadedFilesDisplayProps) {
  if (uploadedFiles.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-20 bg-main-bg">
      <div className="max-w-4xl mx-auto px-4 py-2">
        <div className="flex flex-wrap gap-2">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className={clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
                file.status === 'uploading' && "bg-gray-800 border-gray-600 text-gray-300",
                file.status === 'done' && "bg-green-900 border-green-600 text-green-300",
                file.status === 'error' && "bg-red-900 border-red-600 text-red-300"
              )}
            >
              {/* File Icon */}
              <div className="flex-shrink-0">
                {file.status === 'uploading' ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : file.status === 'done' ? (
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              {/* File Name */}
              <span className="truncate max-w-32">{file.name}</span>
              
              {/* File Type */}
              <span className="text-xs opacity-70">
                {file.name.split('.').pop()?.toUpperCase()}
              </span>
              
              {/* Remove Button */}
              <button
                onClick={() => onRemoveFile(index)}
                className="ml-2 text-gray-400 hover:text-white transition-colors"
                aria-label="Remove file"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 