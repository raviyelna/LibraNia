import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';

interface Backlink {
  id: string;
  title: string;
  linkCount: number;
}

interface BacklinksPanelProps {
  noteId: string;
  onNavigate: (noteId: string) => void;
}

export function BacklinksPanel({ noteId, onNavigate }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBacklinks() {
      try {
        setLoading(true);
        const data = await apiClient.links.getBacklinks(noteId);
        setBacklinks(data);
      } catch (error) {
        console.error('Failed to fetch backlinks:', error);
        setBacklinks([]);
      } finally {
        setLoading(false);
      }
    }
    fetchBacklinks();
  }, [noteId]);

  if (loading) {
    return (
      <div className="backlinks-panel p-4">
        <h3 className="text-lg font-semibold mb-3">Backlinks</h3>
        <div className="text-secondary text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="backlinks-panel p-4">
      <h3 className="text-lg font-semibold mb-3">Backlinks</h3>
      {backlinks.length === 0 ? (
        <div className="text-secondary text-sm">No backlinks yet</div>
      ) : (
        <ul className="space-y-2">
          {backlinks.map(link => (
            <li
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className="text-sm text-foreground hover:text-primary cursor-pointer hover:underline"
            >
              {link.title}
              {link.linkCount > 1 && (
                <span className="ml-2 text-xs text-secondary">({link.linkCount})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
