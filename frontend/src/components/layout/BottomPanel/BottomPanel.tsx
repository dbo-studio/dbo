import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import ResizableYBox from '@/components/base/ResizableBox/ResizableYBox';
import DbTerminal from '@/components/common/DbTerminal/DbTerminal';
import Histories from '@/components/common/Histories/Histories';
import { canUseCli } from '@/core/auth/permissions';
import { closeBottomPanel } from '@/core/bottomPanel';
import { isNoSQLType } from '@/core/db/connectionAliases';
import { useCurrentConnection } from '@/hooks/useCurrentConnection';
import locales from '@/locales';
import { useAuthStore } from '@/store/authStore/auth.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { BottomPanelType } from '@/store/settingStore/types';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { type JSX, useRef, useState } from 'react';

const MIN_HEIGHT = 120;

/** Terminal and query history under the editor tabs, like the VS Code panel. */
export default function BottomPanel(): JSX.Element | null {
  const panel = useSettingStore((s) => s.ui.bottomPanel);
  const updateUI = useSettingStore((s) => s.updateUI);
  const connection = useCurrentConnection();
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const cliAllowed = canUseCli(mode, user);

  const [clearKey, setClearKey] = useState(0);
  const restoreRef = useRef<number | null>(null);

  if (!panel.open) return null;

  // Without the terminal permission the History tab is all there is.
  const tab: BottomPanelType['tab'] = cliAllowed ? panel.tab : 'history';
  const maxHeight = Math.round(window.innerHeight * 0.8);
  const maximized = panel.height >= maxHeight - 4;
  const tabs: { id: BottomPanelType['tab']; label: string }[] = [
    ...(cliAllowed ? [{ id: 'terminal' as const, label: locales.bottom_panel_terminal }] : []),
    { id: 'history', label: locales.bottom_panel_history }
  ];

  // Chevron toggles between the last height and the tallest the panel may be.
  const toggleMaximize = (): void => {
    if (maximized) {
      updateUI({ bottomPanel: { ...panel, height: restoreRef.current ?? 280 } });
    } else {
      restoreRef.current = panel.height;
      updateUI({ bottomPanel: { ...panel, height: maxHeight } });
    }
  };

  return (
    <ResizableYBox
      direction='btt'
      height={Math.max(panel.height, MIN_HEIGHT)}
      maxHeight={maxHeight}
      onChange={(height): void => updateUI({ bottomPanel: { ...panel, height } })}
    >
      <Box
        data-testid='bottom-panel'
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderTop: 1,
          borderColor: 'divider',
          minHeight: 0
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, height: 36, flexShrink: 0 }} role='tablist'>
          {tabs.map((t) => (
            <Box
              key={t.id}
              role='tab'
              tabIndex={0}
              aria-selected={tab === t.id}
              data-testid={`bottom-tab-${t.id}`}
              onClick={(): void => updateUI({ bottomPanel: { ...panel, tab: t.id } })}
              onKeyDown={(e): void => {
                if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click();
              }}
              sx={{
                px: 1.25,
                py: 0.5,
                borderRadius: 1,
                cursor: 'pointer',
                userSelect: 'none',
                typography: 'body2',
                color: tab === t.id ? 'text.primary' : 'text.secondary',
                bgcolor: tab === t.id ? 'action.selected' : 'transparent',
                '&:hover': { color: 'text.primary', bgcolor: tab === t.id ? 'action.selected' : 'action.hover' },
                '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main' }
              }}
            >
              {t.label}
            </Box>
          ))}
          <Box sx={{ flex: 1 }} />
          {tab === 'terminal' && connection && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: 'text.secondary', mr: 0.5 }}>
                <CustomIcon type='terminal' size='s' />
                <Typography variant='body2' noWrap sx={{ maxWidth: 220 }}>
                  {connection.name}
                </Typography>
              </Box>
              <Tooltip title={locales.clear}>
                <IconButton aria-label={locales.clear} onClick={(): void => setClearKey((k) => k + 1)}>
                  <CustomIcon type='delete' size='s' />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title={maximized ? locales.bottom_panel_restore : locales.bottom_panel_maximize}>
            <IconButton
              aria-label={maximized ? locales.bottom_panel_restore : locales.bottom_panel_maximize}
              onClick={toggleMaximize}
            >
              <CustomIcon type={maximized ? 'chevronDown' : 'chevronUp'} size='s' />
            </IconButton>
          </Tooltip>
          <Tooltip title={locales.bottom_panel_close}>
            <IconButton aria-label={locales.bottom_panel_close} onClick={closeBottomPanel}>
              <CustomIcon type='close' size='s' />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {tab === 'history' && <Histories />}
          {tab === 'terminal' &&
            (connection ? (
              <DbTerminal
                key={`${connection.id}:${clearKey}`}
                connectionId={connection.id}
                engine={isNoSQLType(connection.type) ? 'nosql' : 'sql'}
                label={connection.name}
              />
            ) : (
              <Typography sx={{ p: 2 }} color='text.secondary'>
                {locales.bottom_panel_no_connection}
              </Typography>
            ))}
        </Box>
      </Box>
    </ResizableYBox>
  );
}
