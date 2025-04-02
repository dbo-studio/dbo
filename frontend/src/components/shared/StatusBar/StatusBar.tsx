import { useSelectedTab } from '@/hooks/useSelectedTab.tsx';
import { StatusBarStyled } from './StatusBar.styled';
import StatusBarActions from './StatusBarActions/StatusBarActions.tsx';
import StatusBarPagination from './StatusBarPagination/StatusBarPagination';

export default function StatusBar() {
  const selectedTab = useSelectedTab();

  return (
    <StatusBarStyled mode={selectedTab?.mode} direction={'row'} justifyContent={'space-between'}>
      <StatusBarActions />
      <StatusBarPagination />
    </StatusBarStyled>
  );
}
