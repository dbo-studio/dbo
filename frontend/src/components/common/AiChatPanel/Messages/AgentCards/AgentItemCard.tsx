import type { AiAgentItem } from '@/types';
import type { JSX } from 'react';
import DiagramDiffCard from './DiagramDiffCard';
import PermissionCard from './PermissionCard';

export default function AgentItemCard({ item }: { item: AiAgentItem }): JSX.Element | null {
  switch (item.kind) {
    case 'diagram_diff':
      return <DiagramDiffCard diff={item.diff} />;
    case 'permission':
      return <PermissionCard request={item.request} />;
    default:
      return null;
  }
}
