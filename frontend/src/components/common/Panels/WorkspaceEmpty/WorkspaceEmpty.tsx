import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import Kbd from '@/components/base/Kbd/Kbd';
import { openBackup } from '@/core/backup/openBackup';
import { hasEditorTab } from '@/core/db/connectionAliases';
import { openSettings } from '@/core/settings/openSettings';
import { shortcuts } from '@/core/utils';
import { variables } from '@/core/theme/variables';
import { useCurrentConnection } from '@/hooks';
import locales from '@/locales';
import { useCommandPaletteStore } from '@/store/commandPalette/commandPalette.store';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Button, ButtonBase, Typography, alpha } from '@mui/material';
import type { JSX } from 'react';

type Tip = { id: string; icon: keyof typeof IconTypes; title: string; body: string; run?: () => void };

const SHORTCUTS = [
  shortcuts.newTab,
  shortcuts.commandPalette,
  shortcuts.runQuery,
  shortcuts.reloadTab,
  shortcuts.closeTab,
  shortcuts.openShortcuts
];

const openAssistant = (): void => {
  const { sidebar } = useSettingStore.getState().ui;
  useSettingStore.getState().updateUI({ sidebar: { ...sidebar, showRight: true, rightSidebarTab: 0 } });
};

const TIPS: Tip[] = [
  {
    id: 'ai',
    icon: 'sparkles',
    title: locales.workspace_tip_ai_title,
    body: locales.workspace_tip_ai_body,
    run: openAssistant
  },
  {
    id: 'search',
    icon: 'search',
    title: locales.workspace_tip_search_title,
    body: locales.workspace_tip_search_body,
    run: (): void => useCommandPaletteStore.getState().toggle()
  },
  {
    id: 'backup',
    icon: 'backup',
    title: locales.workspace_tip_backup_title,
    body: locales.workspace_tip_backup_body,
    run: (): void => openBackup()
  }
];

const sectionSx = { display: 'grid', gap: 1 } as const;

/** Shown when a connection is open but no tab is: the next step, the keys worth knowing, and a few features. */
export default function WorkspaceEmpty(): JSX.Element {
  const connection = useCurrentConnection();
  const addEditorTab = useTabStore((state) => state.addEditorTab);

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', display: 'flex', p: 3 }} data-testid='workspace-empty'>
      <Box sx={{ m: 'auto', width: 'min(560px, 100%)', display: 'grid', gap: 3 }}>
        <Box sx={{ display: 'grid', gap: 1, justifyItems: 'start' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              display: 'grid',
              placeItems: 'center',
              borderRadius: variables.radius.large,
              bgcolor: (theme): string => alpha(theme.palette.primary.main, 0.12),
              color: 'primary.main'
            }}
          >
            <CustomIcon type='plus' size='m' color='currentColor' />
          </Box>
          <Typography variant='h6' color='textTitle'>
            {locales.workspace_empty_title}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {locales.workspace_empty_description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, pt: 1, flexWrap: 'wrap' }}>
            {hasEditorTab(connection?.type) && (
              <Button
                variant='contained'
                startIcon={<CustomIcon type='plus' size='s' color='currentColor' />}
                onClick={(): void => void addEditorTab()}
              >
                {locales.open_editor}
              </Button>
            )}
            <Button
              variant='outlined'
              startIcon={<CustomIcon type='search' size='s' color='currentColor' />}
              onClick={(): void => useCommandPaletteStore.getState().toggle()}
            >
              {locales.command_palette}
            </Button>
          </Box>
        </Box>

        <Box sx={sectionSx}>
          <Typography variant='overline' color='text.secondary'>
            {locales.workspace_shortcuts}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              columnGap: 3,
              '& > div': { borderBottom: 1, borderColor: 'divider' }
            }}
          >
            {SHORTCUTS.map((item) => (
              <Box
                key={item.id}
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 0.75 }}
              >
                <Typography variant='body2'>{item.label}</Typography>
                <Kbd commands={item.command} />
              </Box>
            ))}
          </Box>
          <Button
            sx={{ justifySelf: 'start' }}
            onClick={(): void => openSettings({ section: 2 })}
            data-testid='workspace-all-shortcuts'
          >
            {locales.keyboard_shortcuts}
          </Button>
        </Box>

        <Box sx={sectionSx}>
          <Typography variant='overline' color='text.secondary'>
            {locales.workspace_tips}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.25 }}>
            {TIPS.map((tip) => (
              <ButtonBase
                key={tip.id}
                onClick={tip.run}
                sx={{
                  display: 'grid',
                  alignContent: 'start',
                  justifyItems: 'start',
                  gap: 0.75,
                  p: 1.5,
                  textAlign: 'left',
                  borderRadius: variables.radius.large,
                  border: 1,
                  borderColor: 'divider',
                  transition: `border-color ${variables.motion.fast} ${variables.motion.easing}`,
                  '&:hover': { borderColor: 'primary.main' },
                  '&:focus-visible': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main' }
                }}
              >
                <CustomIcon type={tip.icon} size='m' />
                <Typography variant='subtitle2'>{tip.title}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {tip.body}
                </Typography>
              </ButtonBase>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
