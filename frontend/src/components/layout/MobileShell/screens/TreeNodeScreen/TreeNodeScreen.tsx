import ScreenHeader from '@/components/base/ScreenHeader/ScreenHeader';
import MobileTreeList from '@/components/common/MobileTreeList/MobileTreeList';
import { useMobileNavStore } from '@/store/mobileNavStore/mobileNav.store';
import type { TreeNodeType } from '@/types/Tree';
import type { JSX } from 'react';
import type { PushedScreenProps } from '../../types';

export default function TreeNodeScreen({ params }: PushedScreenProps): JSX.Element {
  const push = useMobileNavStore((state) => state.push);
  const pop = useMobileNavStore((state) => state.pop);

  const handleDrill = (node: TreeNodeType): void => {
    push({ name: 'treeNode', params: { nodeId: node.id, title: node.name } });
  };

  return (
    <>
      <ScreenHeader title={String(params?.title ?? '')} onBack={(): void => void pop()} />
      <MobileTreeList nodeId={String(params?.nodeId)} onDrill={handleDrill} />
    </>
  );
}
