import type { ReactNode } from 'react';

export function HubWorkspaceShell({ children }: { children: ReactNode }) {
  return <div className='stack hub-workspace-shell'>{children}</div>;
}
