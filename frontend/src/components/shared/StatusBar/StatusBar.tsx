import { useTabStore } from '@/store/tabStore/tab.store';
import { StatusBarStyled } from './StatusBar.styled';
import StatusBarActions from './StatusBarActions/StatusBarActions.tsx';
import StatusBarPagination from './StatusBarPagination/StatusBarPagination';
import StatusBarTabs from './StatusBarTabs/StatusBarTabs.tsx';

export default function StatusBar() {
  const { getSelectedTab } = useTabStore();

  return (
    <StatusBarStyled mode={getSelectedTab()?.mode} direction={'row'} justifyContent={'space-between'}>
      <StatusBarActions />
      <StatusBarTabs />
      <StatusBarPagination />
    </StatusBarStyled>
  );
}
