import { ModeSettings } from '../components/Settings/ModeSettings';

export function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-secondary">Configure LibraNia to suit your preferences</p>
      </div>

      <div className="max-w-2xl">
        <div className="border border-border rounded-lg p-6 bg-background">
          <ModeSettings />
        </div>
      </div>
    </div>
  );
}
