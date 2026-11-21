import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import locales from '@/locales';
import { Collapse } from '@mui/material';
import { useState, type JSX } from 'react';
import type { ThinkingMessageProps } from '../../../types';
import {
  ThinkingMessageCaptionStyled,
  ThinkingMessageContentStyled,
  ThinkingMessageHeaderStyled,
  ThinkingMessageStyled
} from '../ThinkingMessage.styled';

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
      <ThinkingMessageHeaderStyled $collapsed={collapsed} onClick={() => setCollapsed((prev) => !prev)}>
        <ThinkingMessageCaptionStyled variant='caption' color='textSubdued'>
          {seconds ? `${locales.thought_for} ${seconds}s` : locales.thinking}
        </ThinkingMessageCaptionStyled>
        <CustomIcon type={collapsed ? 'chevronRight' : 'chevronDown'} size='xs' />
      </ThinkingMessageHeaderStyled>
      <Collapse in={!collapsed}>
        <ThinkingMessageContentStyled variant='body2' color='textSubdued' dir='auto'>
          {content}
        </ThinkingMessageContentStyled>
      </Collapse>
    </ThinkingMessageStyled>
  );
}
