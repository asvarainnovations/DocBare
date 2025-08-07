interface SessionMetadata {
  id: string;
  user: {
    name: string;
  };
  createdAt: string;
}

interface ChatHeaderProps {
  sessionMeta: SessionMetadata | null;
  loadingMeta: boolean;
  errorMeta: string | null;
}

export default function ChatHeader({ sessionMeta, loadingMeta, errorMeta }: ChatHeaderProps) {
  if (loadingMeta) {
    return (
      <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-main-bg text-white animate-pulse text-sm md:text-base">
        Loading session info…
      </div>
    );
  }

  if (errorMeta) {
    return (
      <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-red-900 text-red-300 text-sm md:text-base">
        {errorMeta}
      </div>
    );
  }

  if (!sessionMeta) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto mt-4 mb-2 px-4 py-2 rounded bg-main-bg flex flex-col md:flex-row md:items-center md:justify-between text-white text-sm md:text-base shadow-md border border-gray-700 bg-opacity-80">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-base md:text-lg truncate">
          Chat with {sessionMeta.user.name}
        </div>
        <div className="text-xs text-gray-400">
          Started: {new Date(sessionMeta.createdAt).toLocaleString()}
        </div>
      </div>
      <div className="text-xs text-gray-400 break-all mt-2 md:mt-0 md:ml-4">
        Session ID: {sessionMeta.id}
      </div>
    </div>
  );
} 