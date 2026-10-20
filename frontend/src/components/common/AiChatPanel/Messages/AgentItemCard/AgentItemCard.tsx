import type { AiAgentItem } from '@/types';
import type { JSX } from 'react';
import DiagramDiffCard from '../DiagramDiffCard/DiagramDiffCard';
import PlanCard from '../PlanCard/PlanCard';

export default function AgentItemCard({ item }: { item: AiAgentItem }): JSX.Element | null {
  switch (item.kind) {
    case 'diagram_diff':
      return <DiagramDiffCard changesetId={item.changesetId} />;
    case 'plan':
      return <PlanCard steps={item.steps} />;
    default:
      return null;
  }
}
