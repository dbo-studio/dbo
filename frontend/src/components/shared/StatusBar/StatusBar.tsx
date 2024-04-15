import { useTabStore } from '@/src/store/tabStore/tab.store';
import dynamic from 'next/dynamic';
import { StatusBarStyled } from './StatusBar.styled';

const StatusBarActions = dynamic(() => import('./StatusBarActions'));
const StatusBarTabs = dynamic(() => import('./StatusBarTabs'));
const StatusBarPagination = dynamic(() => import('./StatusBarPagination'));

export default function StatusBar() {
  const { selectedTab } = useTabStore();

  return (
    <StatusBarStyled mode={selectedTab?.mode} direction={'row'} justifyContent={'space-between'}>
      <StatusBarActions />
      <StatusBarTabs />
      <StatusBarPagination mode={selectedTab?.mode} />
    </StatusBarStyled>
  );
}
