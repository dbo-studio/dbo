import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Collapse, Stack, Typography } from '@mui/material';
import { useState, type JSX } from 'react';
import type { ThinkingMessageProps } from '../../types';
import { ThinkingMessageStyled } from './ThinkingMessage.styled';
import { variables } from '@/core/theme/variables';

export default function ThinkingMessageStatic({
  content,
  durationMs,
  defaultCollapsed = false
}: ThinkingMessageProps): JSX.Element | null {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const seconds = durationMs ? Math.max(1, Math.round(durationMs / 1000)) : undefined;
  if (!content) return null;

  return (
    <ThinkingMessageStyled $isLive={false}>
      <Stack
        direction='row'
        spacing={0.75}
        onClick={() => setCollapsed((prev) => !prev)}
        sx={{ cursor: 'pointer', alignItems: 'center', mb: collapsed ? 0 : 0.5 }}
      >
        <Typography variant='caption' color='textSubdued' sx={{ fontWeight: 500 }}>
          {seconds ? `${locales.thought_for} ${seconds}s` : locales.thinking}
        </Typography>
        <CustomIcon type={collapsed ? 'chevronRight' : 'chevronDown'} size='xs' />
      </Stack>
      <Collapse in={!collapsed}>
        <Typography
          variant='body2'
          color='textSubdued'
          dir='auto'
          sx={{
            whiteSpace: 'pre-wrap',
            fontStyle: 'italic',
            lineHeight: 1.55,
            fontSize: variables.fontSize.md,
            unicodeBidi: 'plaintext'
          }}
        >
          {content}
        </Typography>
      </Collapse>
    </ThinkingMessageStyled>
  );
}