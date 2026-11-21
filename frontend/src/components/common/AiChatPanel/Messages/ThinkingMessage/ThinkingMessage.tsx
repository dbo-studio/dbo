import type { JSX } from 'react';
import type { ThinkingMessageProps } from '../../types';
import ThinkingMessageLive from './ThinkingMessageLive/ThinkingMessageLive';
import ThinkingMessageStatic from './ThinkingMessageStatic/ThinkingMessageStatic';

/** Collapsible thinking trace: live stream subscribes to session state only in ThinkingMessageLive. */
export default function ThinkingMessage(props: ThinkingMessageProps): JSX.Element | null {
  if (props.isLive) return <ThinkingMessageLive {...props} />;
  return <ThinkingMessageStatic {...props} />;
}
