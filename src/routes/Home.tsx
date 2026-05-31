import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  Clock3,
  Library,
  MessageSquare,
  Network,
  Settings2,
  Sparkles,
  Tags,
  X,
} from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { useGraph } from '../hooks/useGraph';
import { useTags } from '../hooks/useTags';
import { useConversations } from '../hooks/useConversations';

type WidgetId = 'recentNotes' | 'graphHealth' | 'recentResearch' | 'tags';

const DASHBOARD_WIDGETS_KEY = 'home-dashboard-widgets';
const DEFAULT_WIDGETS: Record<WidgetId, boolean> = {
  recentNotes: true,
  graphHealth: true,
  recentResearch: true,
  tags: true,
};

const widgetOptions: Array<{ id: WidgetId; label: string; description: string }> = [
  { id: 'recentNotes', label: 'Recent notes', description: 'Continue reading your latest notes.' },
  { id: 'graphHealth', label: 'Graph health', description: 'Track connections across your library.' },
  { id: 'recentResearch', label: 'Recent research', description: 'Resume recent AI conversations.' },
  { id: 'tags', label: 'Tags', description: 'See the vocabulary shaping your library.' },
];

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  const delta = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(delta / 60_000));

  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

export function Home() {
  const { notes, loading: notesLoading } = useNotes();
  const { graphData, loading: graphLoading } = useGraph();
  const { tags, loading: tagsLoading } = useTags();
  const { conversations, loading: conversationsLoading } = useConversations();
  const [customizing, setCustomizing] = useState(false);
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);

  useEffect(() => {
    const savedWidgets = localStorage.getItem(DASHBOARD_WIDGETS_KEY);
    if (!savedWidgets) return;

    try {
      setWidgets({ ...DEFAULT_WIDGETS, ...JSON.parse(savedWidgets) });
    } catch {
      localStorage.removeItem(DASHBOARD_WIDGETS_KEY);
    }
  }, []);

  const toggleWidget = (widgetId: WidgetId) => {
    setWidgets(current => {
      const next = { ...current, [widgetId]: !current[widgetId] };
      localStorage.setItem(DASHBOARD_WIDGETS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const recentNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 4),
    [notes]
  );
  const recentConversations = conversations.slice(0, 4);
  const connectionRate = graphData.nodes.length > 0
    ? Math.round((graphData.links.length / graphData.nodes.length) * 10) / 10
    : 0;
  const visibleWidgetCount = Object.values(widgets).filter(Boolean).length;
  const loading = notesLoading || graphLoading || tagsLoading || conversationsLoading;

  return (
    <div className="h-full overflow-y-auto bg-muted/25">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-border bg-background p-5 shadow-sm md:flex-row md:items-center md:justify-between md:p-7">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Brain size={28} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Knowledge workspace</p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Your LibraNia dashboard</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-secondary">
                Continue your research, inspect your knowledge graph, and keep your local library organized.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCustomizing(true)}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Settings2 size={16} />
            Customize
          </button>
        </header>

        <section aria-label="Quick actions" className="mb-6 grid gap-3 sm:grid-cols-3">
          <Link to="/chat" className="group rounded-xl border border-primary/30 bg-primary p-4 text-white shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
            <MessageSquare size={20} />
            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-semibold">Start AI research</h2>
                <p className="mt-1 text-xs text-white/80">Ask, verify, and write knowledge back.</p>
              </div>
              <ArrowRight className="shrink-0 transition-transform group-hover:translate-x-1" size={18} />
            </div>
          </Link>
          <Link to="/library" className="group rounded-xl border border-border bg-background p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary">
            <Library className="text-primary" size={20} />
            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">Open library</h2>
                <p className="mt-1 text-xs text-secondary">Read, edit, and organize your notes.</p>
              </div>
              <ArrowRight className="shrink-0 text-primary transition-transform group-hover:translate-x-1" size={18} />
            </div>
          </Link>
          <Link to="/graph" className="group rounded-xl border border-border bg-background p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary">
            <Network className="text-primary" size={20} />
            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">Explore graph</h2>
                <p className="mt-1 text-xs text-secondary">Reveal connections across your notes.</p>
              </div>
              <ArrowRight className="shrink-0 text-primary transition-transform group-hover:translate-x-1" size={18} />
            </div>
          </Link>
        </section>

        <section aria-label="Workspace metrics" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard icon={BookOpen} label="Notes" value={notes.length} loading={notesLoading} />
          <MetricCard icon={Network} label="Connections" value={graphData.links.length} loading={graphLoading} />
          <MetricCard icon={Tags} label="Tags" value={tags.length} loading={tagsLoading} />
          <MetricCard icon={Sparkles} label="Research threads" value={conversations.length} loading={conversationsLoading} />
        </section>

        {visibleWidgetCount === 0 ? (
          <section className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
            <Settings2 className="mx-auto text-primary" size={28} />
            <h2 className="mt-3 text-lg font-semibold text-foreground">Your dashboard is clear</h2>
            <p className="mt-1 text-sm text-secondary">Turn on widgets to surface the information you use most.</p>
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              className="mt-4 cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Customize dashboard
            </button>
          </section>
        ) : (
          <section aria-label="Dashboard widgets" className="grid gap-4 lg:grid-cols-2">
            {widgets.recentNotes && <RecentNotesWidget notes={recentNotes} loading={notesLoading} />}
            {widgets.graphHealth && (
              <GraphHealthWidget
                noteCount={graphData.nodes.length}
                linkCount={graphData.links.length}
                connectionRate={connectionRate}
                loading={graphLoading}
              />
            )}
            {widgets.recentResearch && <RecentResearchWidget conversations={recentConversations} loading={conversationsLoading} />}
            {widgets.tags && <TagsWidget tags={tags.slice(0, 16)} loading={tagsLoading} />}
          </section>
        )}

        {loading && (
          <p className="mt-4 text-xs text-secondary" aria-live="polite">Refreshing your local workspace...</p>
        )}
      </div>

      {customizing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="presentation" onMouseDown={() => setCustomizing(false)}>
          <aside
            className="h-full w-full max-w-sm overflow-y-auto border-l border-border bg-background p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-customize-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <h2 id="dashboard-customize-title" className="text-lg font-semibold text-foreground">Customize dashboard</h2>
                <p className="mt-1 text-sm leading-5 text-secondary">Choose which workspace signals appear on Home.</p>
              </div>
              <button
                type="button"
                onClick={() => setCustomizing(false)}
                className="cursor-pointer rounded-md p-2 text-secondary transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close dashboard customization"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {widgetOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleWidget(option.id)}
                  aria-pressed={widgets[option.id]}
                  className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                    widgets[option.id] ? 'border-primary bg-primary text-white' : 'border-border bg-background'
                  }`}>
                    {widgets[option.id] && <Check size={13} />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-foreground">{option.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-secondary">{option.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, loading }: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</span>
        <Icon className="text-primary" size={16} />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">{loading ? '–' : value}</p>
    </div>
  );
}

function WidgetShell({ title, description, icon: Icon, children, link }: {
  title: string;
  description: string;
  icon: typeof BookOpen;
  children: React.ReactNode;
  link: { to: string; label: string };
}) {
  return (
    <article className="rounded-xl border border-border bg-background shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
        <div className="flex gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><Icon size={16} /></div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="mt-0.5 text-xs text-secondary">{description}</p>
          </div>
        </div>
        <Link to={link.to} className="shrink-0 text-xs font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary">
          {link.label}
        </Link>
      </div>
      <div className="p-4">{children}</div>
    </article>
  );
}

function RecentNotesWidget({ notes, loading }: { notes: Array<{ id: string; title: string; updated_at: string }>; loading: boolean }) {
  return (
    <WidgetShell title="Recent notes" description="Pick up where you left off." icon={BookOpen} link={{ to: '/library', label: 'View library' }}>
      {loading ? <WidgetLoading /> : notes.length === 0 ? <WidgetEmpty text="No notes yet. Start with your first research topic." /> : (
        <ul className="space-y-1">
          {notes.map(note => (
            <li key={note.id}>
              <Link to="/library" className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary">
                <span className="truncate text-sm font-medium text-foreground">{note.title}</span>
                <span className="shrink-0 text-xs text-secondary">{formatRelativeTime(note.updated_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}

function GraphHealthWidget({ noteCount, linkCount, connectionRate, loading }: {
  noteCount: number;
  linkCount: number;
  connectionRate: number;
  loading: boolean;
}) {
  return (
    <WidgetShell title="Graph health" description="See how your knowledge compounds." icon={Network} link={{ to: '/graph', label: 'Open graph' }}>
      {loading ? <WidgetLoading /> : (
        <div className="grid grid-cols-3 gap-3">
          <SmallStat label="Nodes" value={noteCount} />
          <SmallStat label="Links" value={linkCount} />
          <SmallStat label="Links / note" value={connectionRate} />
        </div>
      )}
    </WidgetShell>
  );
}

function RecentResearchWidget({ conversations, loading }: {
  conversations: Array<{ id: string; title: string; updated_at: string }>;
  loading: boolean;
}) {
  return (
    <WidgetShell title="Recent research" description="Return to your latest AI threads." icon={MessageSquare} link={{ to: '/chat', label: 'Open chat' }}>
      {loading ? <WidgetLoading /> : conversations.length === 0 ? <WidgetEmpty text="No research threads yet. Ask LibraNia a question." /> : (
        <ul className="space-y-1">
          {conversations.map(conversation => (
            <li key={conversation.id}>
              <Link to="/chat" className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary">
                <span className="truncate text-sm font-medium text-foreground">{conversation.title}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-secondary"><Clock3 size={12} />{formatRelativeTime(conversation.updated_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  );
}

function TagsWidget({ tags, loading }: { tags: Array<{ id: string; name: string }>; loading: boolean }) {
  return (
    <WidgetShell title="Tag vocabulary" description="The concepts shaping your library." icon={Tags} link={{ to: '/library', label: 'Organize' }}>
      {loading ? <WidgetLoading /> : tags.length === 0 ? <WidgetEmpty text="Tags appear here as you organize notes." /> : (
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <span key={tag.id} className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </WidgetShell>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/60 p-3">
      <p className="text-lg font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-secondary">{label}</p>
    </div>
  );
}

function WidgetLoading() {
  return <p className="text-sm text-secondary" aria-live="polite">Loading...</p>;
}

function WidgetEmpty({ text }: { text: string }) {
  return <p className="text-sm leading-6 text-secondary">{text}</p>;
}
