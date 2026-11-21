import type { JSX } from 'react';
import type { ThinkingMessageProps } from '../../types';
import ThinkingMessageBody from './ThinkingMessageBody';
import ThinkingMessageStatic from './ThinkingMessageStatic';

export default function ThinkingMessage(props: ThinkingMessageProps): JSX.Element | null {
  if (props.isLive) return <ThinkingMessageBody {...props} isLive />;
  return <ThinkingMessageStatic {...props} />;
}