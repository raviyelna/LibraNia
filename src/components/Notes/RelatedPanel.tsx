import { useSemanticLinks } from '../../hooks/useSemanticLinks';

interface RelatedPanelProps {
  noteId: string;
  onNavigate: (noteId: string) => void;
}

export function RelatedPanel({ noteId, onNavigate }: RelatedPanelProps) {
  const { links, loading, error } = useSemanticLinks(noteId);

  if (loading) {
    return (
      <div className="related-panel p-4">
        <h3 className="text-lg font-semibold mb-3">Related Concepts</h3>
        <div className="text-secondary text-sm">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="related-panel p-4">
        <h3 className="text-lg font-semibold mb-3">Related Concepts</h3>
        <div className="text-destructive text-sm">Failed to load related notes</div>
      </div>
    );
  }

  return (
    <div className="related-panel p-4">
      <h3 className="text-lg font-semibold mb-3">Related Concepts</h3>
      {!links || links.length === 0 ? (
        <div className="text-secondary text-sm">No related notes yet</div>
      ) : (
        <ul className="space-y-2">
          {links.map(link => (
            <li
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className="text-sm text-foreground hover:text-primary cursor-pointer hover:underline"
            >
              {link.title}
              <span className="ml-2 text-xs text-secondary">
                ({Math.round(link.similarity * 100)}% similar)
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
