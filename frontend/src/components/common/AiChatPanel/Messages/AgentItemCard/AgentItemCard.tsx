import type { AiAgentItem } from '@/types';
import type { JSX } from 'react';
import PlanCard from '../PlanCard/PlanCard';
import ProposalItem from './ProposalItem/ProposalItem';

export default function AgentItemCard({ item }: { item: AiAgentItem }): JSX.Element | null {
  switch (item.kind) {
    case 'diagram_diff':
      return <ProposalItem changesetId={item.changesetId} />;
    case 'plan':
      return <PlanCard steps={item.steps} />;
    default:
      return null;
  }
}
