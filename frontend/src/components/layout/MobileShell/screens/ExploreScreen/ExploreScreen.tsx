import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import ScreenHeader from '@/components/base/ScreenHeader/ScreenHeader';
import MobileTreeList from '@/components/common/MobileTreeList/MobileTreeList';
import locales from '@/locales';
import { useMobileNavStore } from '@/store/mobileNavStore/mobileNav.store';
import type { TreeNodeType } from '@/types/Tree';
import { IconButton } from '@mui/material';
import type { JSX } from 'react';

export default function ExploreScreen(): JSX.Element {
  const push = useMobileNavStore((state) => state.push);

  const handleDrill = (node: TreeNodeType): void => {
    push({ name: 'treeNode', params: { nodeId: node.id, title: node.name } });
  };

  return (
    <>
      <ScreenHeader
        title={locales.mobile_tab_explore}
        actions={
          <>
            <IconButton aria-label={locales.queries} onClick={(): void => push({ name: 'savedQueries' })}>
              <CustomIcon type='bookmark' size='m' />
            </IconButton>
            <IconButton aria-label={locales.history} onClick={(): void => push({ name: 'history' })}>
              <CustomIcon type='history' size='m' />
            </IconButton>
          </>
        }
      />
      <MobileTreeList onDrill={handleDrill} />
    </>
  );
}
