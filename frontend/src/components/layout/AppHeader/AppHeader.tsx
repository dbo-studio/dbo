import { AppHeaderGridStyled, AppHeaderStyled } from '@/components/layout/AppHeader/AppHeader.styled.ts';
import { useLayoutMode } from '@/hooks';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Grid } from '@mui/material';
import type { JSX, MouseEvent as ReactMouseEvent } from 'react';
import Actions from './Actions/Actions.tsx';
import ConnectionInfo from './ConnectionInfo/ConnectionInfo';
import HeaderOverflowMenu from './HeaderOverflowMenu/HeaderOverflowMenu';
import Leading from './Leading/Leading.tsx';

export default function AppHeader(): JSX.Element {
  const { useCompactHeader } = useLayoutMode();
  const titleBar = useSettingStore((state) => state.ui.titleBar);

  const onMouseDown = (event: ReactMouseEvent<HTMLDivElement>): void => {
    titleBar.onHeaderAreaClick?.(event.nativeEvent);
  };

  return (
    <AppHeaderStyled
      className={'app-header'}
      container
      spacing={0}
      style={{
        paddingLeft: titleBar.paddingLeft,
        paddingTop: titleBar.paddingTop
      }}
      onMouseDown={onMouseDown}
    >
      <AppHeaderGridStyled useCompactHeader={useCompactHeader} size='auto'>
        <HeaderOverflowMenu />
      </AppHeaderGridStyled>
      <Grid
        size={{ md: 2 }}
        sx={{
          display: useCompactHeader ? 'none' : 'flex',
          justifyContent: 'flex-start'
        }}
      >
        <Leading />
      </Grid>
      <Grid
        size='grow'
        sx={{
          minWidth: 0
        }}
      >
        <ConnectionInfo compact={useCompactHeader} />
      </Grid>
      <Grid
        size={{ md: 2 }}
        sx={{
          display: useCompactHeader ? 'none' : 'flex',
          justifyContent: 'flex-end'
        }}
      >
        <Actions />
      </Grid>
    </AppHeaderStyled>
  );
}
