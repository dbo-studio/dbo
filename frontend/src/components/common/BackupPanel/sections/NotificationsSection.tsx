import type { JSX } from 'react';
import ConnectorsSection from '../connectors/ConnectorsSection';

export default function NotificationsSection(): JSX.Element {
  return <ConnectorsSection kind='channel' />;
}
