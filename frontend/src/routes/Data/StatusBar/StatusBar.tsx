import type { JSX } from 'react';
import { StatusBarStyled } from './StatusBar.styled';
import StatusBarActions from './StatusBarActions/StatusBarActions.tsx';
import StatusBarPagination from './StatusBarPagination/StatusBarPagination';

export default function StatusBar(): JSX.Element {
  return (
    <StatusBarStyled direction={'row'} justifyContent={'space-between'}>
      <StatusBarActions />
      <StatusBarPagination />
    </StatusBarStyled>
  );
}
