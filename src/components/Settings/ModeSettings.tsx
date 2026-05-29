import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { configAPI } from '../../api';

type AppMode = 'desktop' | 'web';

interface AppConfig {
  mode: AppMode;
  theme: 'light' | 'dark' | 'system';
  windowBounds: { x: number; y: number; width: number; height: number } | null;
  serverPort: number;
}

export function ModeSettings() {
  const [currentMode, setCurrentMode] = useState<AppMode>('desktop');
  const [selectedMode, setSelectedMode] = useState<AppMode>('desktop');
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load current mode from config
    const loadConfig = async () => {
      try {
        const config = await configAPI.get() as AppConfig;
        setCurrentMode(config.mode);
        setSelectedMode(config.mode);
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleApply = () => {
    if (selectedMode !== currentMode) {
      setShowRestartDialog(true);
    }
  };

  const handleRestart = async () => {
    try {
      await configAPI.update({ mode: selectedMode });
      // TODO: implement app restart in web mode
      alert('Mode updated. Please restart the app manually.');
      setShowRestartDialog(false);
    } catch (error) {
      console.error('Failed to switch mode:', error);
      setShowRestartDialog(false);
    }
  };

  const handleCancel = () => {
    setShowRestartDialog(false);
    setSelectedMode(currentMode);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Application Mode</h2>
        <p className="text-sm text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Application Mode</h2>
          <p className="text-sm text-secondary mb-4">
            Choose how LibraNia runs on your system. Changing mode requires restarting the application.
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start space-x-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="radio"
              name="mode"
              value="desktop"
              checked={selectedMode === 'desktop'}
              onChange={(e) => setSelectedMode(e.target.value as AppMode)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-foreground">Desktop</div>
              <div className="text-sm text-secondary">
                Run as native desktop application (recommended)
              </div>
            </div>
          </label>

          <label className="flex items-start space-x-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <input
              type="radio"
              name="mode"
              value="web"
              checked={selectedMode === 'web'}
              onChange={(e) => setSelectedMode(e.target.value as AppMode)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-foreground">Web</div>
              <div className="text-sm text-secondary">
                Run in web browser at http://localhost:3000 (production only)
              </div>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-sm text-secondary">
            {selectedMode !== currentMode && 'Restart required to apply changes'}
          </p>
          <Button
            onClick={handleApply}
            disabled={selectedMode === currentMode}
          >
            Apply
          </Button>
        </div>
      </div>

      <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restart Required</DialogTitle>
            <DialogDescription>
              Changing the application mode requires restarting LibraNia. Would you like to restart now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleRestart}>
              Restart Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
