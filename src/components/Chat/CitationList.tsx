interface Citation {
  position: number;
  url: string;
  title: string;
  snippet?: string;
}

interface CitationListProps {
  citations: Citation[];
}

export function CitationList({ citations }: CitationListProps) {
  const extractDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const handleCitationClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="citations mt-3 pt-3 border-t border-border">
      <ol className="space-y-1">
        {citations.map((citation) => (
          <li key={citation.position} className="text-sm text-secondary">
            <button
              onClick={() => handleCitationClick(citation.url)}
              className="hover:text-primary transition-colors text-left"
            >
              [{citation.position}] {citation.title} - {extractDomain(citation.url)}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
