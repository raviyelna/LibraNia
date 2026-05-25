/**
 * Offline indicator banner
 * Displays at top of app when network is unavailable
 */

import { WifiOff, X } from 'lucide-react';
import { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if online or dismissed
  if (isOnline || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-900 px-4 py-3 shadow-md animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <WifiOff className="w-5 h-5" />
          <span className="font-medium">
            You are offline. Some features may be unavailable.
          </span>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-yellow-600/20 rounded transition-colors"
          aria-label="Dismiss offline indicator"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
