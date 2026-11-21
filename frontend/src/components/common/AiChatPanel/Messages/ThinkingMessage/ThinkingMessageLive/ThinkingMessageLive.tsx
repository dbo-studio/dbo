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
import { LivePulseDotStyled } from './ThinkingMessageLive.styled';

export default function ThinkingMessageLive({ content }: ThinkingMessageProps): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <ThinkingMessageStyled $isLive data-testid='ai-thinking'>
      <ThinkingMessageHeaderStyled $collapsed={collapsed} onClick={() => setCollapsed((prev) => !prev)}>
        <LivePulseDotStyled />
        <ThinkingMessageCaptionStyled variant='caption' color='textSubdued'>
          {`${locales.thinking}...`}
        </ThinkingMessageCaptionStyled>
        <CustomIcon type={collapsed ? 'chevronRight' : 'chevronDown'} size='xs' />
      </ThinkingMessageHeaderStyled>
      <Collapse in={!collapsed}>
        <ThinkingMessageContentStyled variant='body2' color='textSubdued' dir='auto'>
          {content || '...'}
        </ThinkingMessageContentStyled>
      </Collapse>
    </ThinkingMessageStyled>
  );
}
