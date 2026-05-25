interface ProviderBadgeProps {
  provider_id: string;
  model: string;
}

export function ProviderBadge({ provider_id, model }: ProviderBadgeProps) {
  const providerNames: Record<string, string> = {
    claude: 'Claude',
    openai: 'GPT',
    deepseek: 'DeepSeek',
  };

  const displayName = providerNames[provider_id] || provider_id;

  return (
    <span className="inline-flex items-center px-2 py-1 text-xs bg-accent text-accent-foreground rounded">
      {displayName} {model}
    </span>
  );
}
