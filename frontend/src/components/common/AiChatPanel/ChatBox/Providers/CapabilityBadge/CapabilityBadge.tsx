import { formatContextWindow, getModelCapabilities } from '@/core/ai/modelCapabilities';
import locales from '@/locales';
import type { AiProviderType } from '@/types';
import type { JSX } from 'react';
import { CapabilityBadgeChipStyled } from './CapabilityBadge.styled';

type CapabilityBadgeProps = {
  provider: AiProviderType;
  model: string;
};

export default function CapabilityBadge({ provider, model }: CapabilityBadgeProps): JSX.Element | null {
  const caps = getModelCapabilities(provider.type, model);
  if (!caps.tools) return null;

  const label = caps.contextWindow
    ? `${locales.ai_tools_supported} · ${formatContextWindow(caps.contextWindow)}`
    : locales.ai_tools_supported;
  return <CapabilityBadgeChipStyled variant='outlined' label={label} />;
}
