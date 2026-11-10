import locales from '@/locales';
import { useSelectedTab } from '@/hooks';
import type { ToolTabType } from '@/types/Tab';
import { Typography } from '@mui/material';
import type { ComponentType, JSX } from 'react';
import PubSubTool from './PubSubTool';

/** Tool registry: tool id (from `ContainerSpec.tools`) to its component. Add new engine-specific tools here. */
const TOOLS: Record<string, ComponentType<{ connectionId: number }>> = {
  pubsub: PubSubTool
};

export default function Tool(): JSX.Element {
  const tab = useSelectedTab<ToolTabType>();
  if (!tab) return <></>;

  const Component = TOOLS[tab.toolId];

  return Component ? (
    <Component key={tab.id} connectionId={Number(tab.connectionId)} />
  ) : (
    <Typography sx={{ p: 2 }}>{locales.nosql_tool_unknown}</Typography>
  );
}
