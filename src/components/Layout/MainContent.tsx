import { ReactNode } from 'react';

interface MainContentProps {
  children: ReactNode;
  sidebarCollapsed?: boolean;
}

export function MainContent({ children, sidebarCollapsed = false }: MainContentProps) {
  const marginLeft = sidebarCollapsed ? 'ml-16' : 'ml-60';

  return (
    <main className={`flex-1 p-6 bg-background transition-all duration-200 ${marginLeft} min-h-screen`}>
      {children}
    </main>
  );
}
