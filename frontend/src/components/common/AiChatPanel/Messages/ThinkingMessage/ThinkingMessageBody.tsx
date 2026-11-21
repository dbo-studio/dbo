import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Box, Collapse, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { useState, type JSX } from 'react';
import type { ThinkingMessageProps } from '../../types';
import { ThinkingMessageStyled } from './ThinkingMessage.styled';
import { variables } from '@/core/theme/variables';
import { useLiveThinkingDurationMs } from './useLiveThinkingDuration';

const pulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

type ThinkingMessageBodyProps = ThinkingMessageProps;

export default function ThinkingMessageBody({
  content,
  durationMs,
  isLive = false,
  defaultCollapsed = false
}: ThinkingMessageBodyProps): JSX.Element | null {
  const [collapsed, setCollapsed] = useState(defaultCollapsed && !isLive);
  const [prevProps, setPrevProps] = useState({ defaultCollapsed, isLive });
  const liveDurationMs = useLiveThinkingDurationMs();

  if (prevProps.defaultCollapsed !== defaultCollapsed || prevProps.isLive !== isLive) {
    setPrevProps({ defaultCollapsed, isLive });
    setCollapsed(isLive ? false : defaultCollapsed);
  }

  const displayDurationMs = isLive ? (durationMs ?? liveDurationMs) : durationMs;
  const seconds = displayDurationMs ? Math.max(1, Math.round(displayDurationMs / 1000)) : undefined;

  if (!content && !isLive) return null;

  return (
    <ThinkingMessageStyled $isLive={isLive} data-testid={isLive ? 'ai-thinking' : undefined}>
      <Stack
        direction='row'
        spacing={0.75}
        onClick={() => setCollapsed((prev) => !prev)}
        sx={{ cursor: 'pointer', alignItems: 'center', mb: collapsed ? 0 : 0.5 }}
      >
        {isLive && (
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              animation: `${pulse} 1.4s ease-in-out infinite`,
              flexShrink: 0
            }}
          />
        )}
        <Typography variant='caption' color='textSubdued' sx={{ fontWeight: 500 }}>
          {isLive ? `${locales.thinking}...` : seconds ? `${locales.thought_for} ${seconds}s` : locales.thinking}
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
          {content || (isLive ? '...' : '')}
        </Typography>
      </Collapse>
    </ThinkingMessageStyled>
  );
}