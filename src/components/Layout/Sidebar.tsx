import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Library, MessageSquare, Settings, ChevronLeft, ChevronRight, Sun, Moon, Network, Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTheme } from '../../hooks/useTheme';

const navigationItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Library, label: 'Library', path: '/library' },
  { icon: MessageSquare, label: 'Chat', path: '/chat' },
  { icon: Network, label: 'Graph', path: '/graph' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState === 'true') {
      setCollapsed(true);
    }
  }, []);

  // Save collapsed state to localStorage
  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-60';

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background border border-border rounded-md shadow-lg"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen bg-background border-r border-border transition-all duration-200 ${sidebarWidth} flex flex-col z-40
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
      {/* Header with logo and toggle */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && <h1 className="text-xl font-bold text-foreground">LibraNia</h1>}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          aria-label="Toggle sidebar"
          className="ml-auto"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-2 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-foreground hover:bg-muted'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" role="img" aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Theme toggle at bottom */}
      <div className="p-2 border-t border-border">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className={`w-full ${collapsed ? '' : 'justify-start gap-3'}`}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 flex-shrink-0" role="img" aria-hidden="true" />
          ) : (
            <Moon className="h-5 w-5 flex-shrink-0" role="img" aria-hidden="true" />
          )}
          {!collapsed && <span>Toggle Theme</span>}
        </Button>
      </div>
    </aside>
    </>
  );
}
