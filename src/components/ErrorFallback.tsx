/**
 * Error Fallback UI component
 * Displays user-friendly error message with recovery options
 */

import { AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleOpenLogs = () => {
    if (window.electronAPI?.openLogsDirectory) {
      window.electronAPI.openLogsDirectory();
    }
  };

  const handleReloadApp = () => {
    if (window.electronAPI?.reloadApp) {
      window.electronAPI.reloadApp();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
        </div>

        <p className="text-muted">
          We've logged the error and will investigate. You can try reloading the page.
        </p>

        <details className="bg-muted/50 rounded p-3 text-sm">
          <summary className="cursor-pointer font-medium text-foreground mb-2">
            Error details (for developers)
          </summary>
          <div className="space-y-2 mt-2">
            <div>
              <strong>Message:</strong>
              <pre className="mt-1 text-xs overflow-auto">{error.message}</pre>
            </div>
            {error.stack && (
              <div>
                <strong>Stack trace:</strong>
                <pre className="mt-1 text-xs overflow-auto whitespace-pre-wrap">
                  {error.stack}
                </pre>
              </div>
            )}
          </div>
        </details>

        <div className="flex flex-col gap-2">
          <Button onClick={resetError} className="w-full">
            Try Again
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleOpenLogs} variant="outline" className="flex-1">
              Open Logs
            </Button>
            <Button onClick={handleReloadApp} variant="outline" className="flex-1">
              Reload App
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
