import type { ReactNode } from 'react';

export function MapWorkspaceShell({ children }: { children: ReactNode }) {
  return <div className='stack map-workspace-shell'>{children}</div>;
}
