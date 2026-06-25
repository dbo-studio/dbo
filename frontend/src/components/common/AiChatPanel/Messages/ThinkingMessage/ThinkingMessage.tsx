import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Box, Collapse, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { ThinkingMessageStyled } from './ThinkingMessage.styled';

const pulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

type ThinkingMessageProps = {
  content: string;
  durationMs?: number;
  isLive?: boolean;
  defaultCollapsed?: boolean;
};

export default function ThinkingMessage({
  content,
  durationMs,
  isLive = false,
  defaultCollapsed = false
}: ThinkingMessageProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed && !isLive);
  const streaming = useAiStore((state) => state.streaming);

  useEffect(() => {
    if (!isLive && defaultCollapsed) {
      setCollapsed(true);
    }
    if (isLive) {
      setCollapsed(false);
    }
  }, [defaultCollapsed, isLive]);

  const displayDurationMs = durationMs ?? streaming.thinkingDurationMs;
  const seconds = displayDurationMs ? Math.max(1, Math.round(displayDurationMs / 1000)) : undefined;

  if (!content && !isLive) return null;

  return (
    <ThinkingMessageStyled $isLive={isLive}>
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
          sx={{
            whiteSpace: 'pre-wrap',
            fontStyle: 'italic',
            lineHeight: 1.55,
            fontSize: '0.8125rem'
          }}
        >
          {content || (isLive ? '...' : '')}
        </Typography>
      </Collapse>
    </ThinkingMessageStyled>
  );
}
