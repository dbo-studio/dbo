import { variables } from '@/core/theme/variables';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { IconProps } from '@/components/base/CustomIcon/types';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import { Box, ButtonBase, Typography } from '@mui/material';
import type { JSX } from 'react';

type ArtifactChipProps = {
  icon: IconProps['type'];
  label: string;
  detail?: string;
  testId: string;
  onOpen: () => void;
};

/** True while the full-window workstation is open: there, what the agent makes lives on the canvas, not in the chat. */
export const useInWorkstation = (): boolean => useSettingStore((state) => state.ui.agentWorkspaceOpen);

/** A one-line link from the chat to something the agent made, which the canvas shows in full. */
export default function ArtifactChip({ icon, label, detail, testId, onOpen }: ArtifactChipProps): JSX.Element {
  return (
    <ButtonBase
      onClick={onOpen}
      title={locales.ai_canvas_open_artifact}
      data-testid={testId}
      sx={{
        alignSelf: 'flex-start',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        maxWidth: '100%',
        px: 1,
        py: 0.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: variables.radius.small,
        bgcolor: 'background.paper',
        '&:hover': { bgcolor: 'action.hover' }
      }}
    >
      <CustomIcon type={icon} size='xs' />
      <Typography variant='caption' noWrap sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      {detail && (
        <Typography variant='caption' color='textSubdued' noWrap>
          {detail}
        </Typography>
      )}
      <Box component='span' sx={{ display: 'inline-flex', color: 'text.secondary' }}>
        <CustomIcon type='chevronRight' size='xs' />
      </Box>
    </ButtonBase>
  );
}
