import { AppHeaderGridStyled, AppHeaderStyled } from '@/components/layout/AppHeader/AppHeader.styled.ts';
import { useLayoutMode } from '@/hooks';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Grid } from '@mui/material';
import { type JSX, useEffect, useState } from 'react';
import Actions from './Actions/Actions.tsx';
import ConnectionInfo from './ConnectionInfo/ConnectionInfo';
import HeaderOverflowMenu from './HeaderOverflowMenu/HeaderOverflowMenu';
import Leading from './Leading/Leading.tsx';

export default function AppHeader(): JSX.Element {
  const { useCompactHeader } = useLayoutMode();
  const titleBar = useSettingStore((state) => state.ui.titleBar);
  const draggable = Boolean(titleBar?.draggable);
  const [windowFocused, setWindowFocused] = useState(true);

  // Native title bars dim when the window is inactive; only the desktop overlay title bar does this.
  useEffect(() => {
    if (!draggable) return;
    const onFocus = (): void => setWindowFocused(true);
    const onBlur = (): void => setWindowFocused(false);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, [draggable]);

  return (
    <AppHeaderStyled
      className={'app-header'}
      container
      spacing={0}
      style={{
        paddingLeft: titleBar?.paddingLeft,
        opacity: draggable && !windowFocused ? 0.55 : 1,
        transition: 'opacity 150ms'
      }}
      // Tauri drag script: drag/zoom from any non-interactive descendant
      data-tauri-drag-region={titleBar?.draggable ? 'deep' : undefined}
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
