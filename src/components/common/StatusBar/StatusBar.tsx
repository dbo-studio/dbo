import { useTabStore } from '@/src/store/tabStore/tab.store';
import { StatusBarStyled } from './StatusBar.styled';
import StatusBarActions from './StatusBarActions';
import StatusBarPagination from './StatusBarPagination';
import StatusBarTabs from './StatusBarTabs';

export default function StatusBar() {
  const { selectedTab } = useTabStore();

  return (
    <StatusBarStyled mode={selectedTab?.mode}>
      <StatusBarActions />
      <StatusBarTabs />
      <StatusBarPagination />
    </StatusBarStyled>
  );
}
