import { AIProviderSettings } from '../components/Settings/AIProviderSettings';

export function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto scrollable p-6">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-secondary">Configure LibraNia to suit your preferences</p>
        </div>

        <div className="max-w-2xl space-y-8">
          <div>
            <h2 className="text-2xl font-semibold text-foreground mb-4">AI Providers</h2>
            <AIProviderSettings />
          </div>
        </div>
      </div>
    </div>
  );
}
