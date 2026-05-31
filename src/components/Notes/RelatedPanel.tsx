import { useSemanticLinks } from '../../hooks/useSemanticLinks';

interface RelatedPanelProps {
  noteId: string;
  onNavigate: (noteId: string) => void;
  hideHeading?: boolean;
}

export function RelatedPanel({ noteId, onNavigate, hideHeading = false }: RelatedPanelProps) {
  const { links, loading, error } = useSemanticLinks(noteId);

  if (loading) {
    return (
      <div className="related-panel p-4">
        {!hideHeading && <h3 className="text-lg font-semibold mb-3">Related notes</h3>}
        <div className="text-secondary text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="related-panel p-4">
        {!hideHeading && <h3 className="text-lg font-semibold mb-3">Related notes</h3>}
        <div className="text-destructive text-sm">Failed to load related notes</div>
      </div>
    );
  }

  return (
    <div className="related-panel p-4">
      {!hideHeading && <h3 className="text-lg font-semibold mb-3">Related notes</h3>}
      {!links || links.length === 0 ? (
        <div className="text-secondary text-sm">No related notes yet</div>
      ) : (
        <ul className="space-y-2">
          {links.map(link => (
            <li
              key={link.id}
              onClick={() => link.relationship !== 'missing' && onNavigate(link.id)}
              className={`text-sm ${
                link.relationship === 'missing'
                  ? 'cursor-default text-secondary'
                  : 'cursor-pointer text-foreground hover:text-primary hover:underline'
              }`}
            >
              {link.title}
              {link.similarity !== undefined ? (
                <span className="ml-2 text-xs text-secondary">
                  ({Math.round(link.similarity * 100)}% similar)
                </span>
              ) : link.relationship === 'missing' ? (
                <span className="ml-2 text-xs text-secondary">(linked note not found)</span>
              ) : (
                <span className="ml-2 text-xs text-secondary">(linked)</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
