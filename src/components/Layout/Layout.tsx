import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { useState, useEffect } from 'react';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync with localStorage changes
  useEffect(() => {
    const checkCollapsed = () => {
      const collapsed = localStorage.getItem('sidebar-collapsed') === 'true';
      setSidebarCollapsed(collapsed);
    };

    checkCollapsed();

    // Listen for storage events (in case sidebar state changes)
    window.addEventListener('storage', checkCollapsed);

    // Poll for changes (since localStorage doesn't emit events for same-window changes)
    const interval = setInterval(checkCollapsed, 100);

    return () => {
      window.removeEventListener('storage', checkCollapsed);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <MainContent sidebarCollapsed={sidebarCollapsed}>
        <Outlet />
      </MainContent>
    </div>
  );
}
