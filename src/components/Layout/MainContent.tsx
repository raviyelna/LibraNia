import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface MainContentProps {
  children: ReactNode;
  sidebarCollapsed?: boolean;
}

export function MainContent({ children, sidebarCollapsed = false }: MainContentProps) {
  const location = useLocation();
  const marginLeft = sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60';

  // Graph page needs full viewport without padding
  const isGraphPage = location.pathname === '/graph';
  const paddingClass = isGraphPage ? '' : '';

  return (
    <main className={`flex-1 bg-background transition-all duration-200 ${marginLeft} ${paddingClass} h-screen overflow-hidden`}>
      {children}
    </main>
  );
}
