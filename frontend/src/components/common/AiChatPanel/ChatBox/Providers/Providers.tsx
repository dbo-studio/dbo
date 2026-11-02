import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { isProviderReady } from '@/core/ai/aiStatus';
import { PROVIDER_NAMES } from '@/core/ai/providerNames';
import { formatContextWindow, getModelCapabilities } from '@/core/ai/modelCapabilities';
import { openSettings } from '@/core/settings/openSettings';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { AiProviderType } from '@/types';
import { Chip, Divider, ListSubheader, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { useAiChatMode } from '../../hooks/useAiChatMode';
import { CapabilityIconStyled, ModelButtonStyled, ProvidersStyled, VisuallyHidden } from './Providers.styled';
import { variables } from '@/core/theme/variables';

const badgeSx = { height: 18, fontSize: variables.fontSize.xxs, '& .MuiChip-label': { px: 0.75 } };

function CapabilityBadge({ provider, model }: { provider: AiProviderType; model: string }): JSX.Element | null {
  const caps = getModelCapabilities(provider.type, model);
  if (!caps.tools) return null;

  const label = caps.contextWindow
    ? `${locales.ai_tools_supported} · ${formatContextWindow(caps.contextWindow)}`
    : locales.ai_tools_supported;
  return <Chip size='small' variant='outlined' label={label} sx={badgeSx} />;
}

/** Composer footer model picker: shows active provider + model and switches both in one step. */
export default function Providers(): JSX.Element {
  const providers = useAiStore((state) => state.providers);
  const updateProviders = useAiStore((state) => state.updateProviders);
  const [mode] = useAiChatMode();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const active = providers?.find((item) => item.isActive);
  const activeCaps = getModelCapabilities(active?.type, active?.model);

  const { mutateAsync: updateProviderMutation, isPending } = useMutation<
    AiProviderType,
    unknown,
    { providerId: number; data: Partial<AiProviderType> }
  >({
    mutationFn: ({ providerId, data }) => api.aiProvider.updateProvider(providerId, data)
  });

  const handleSelect = async (provider: AiProviderType, model: string): Promise<void> => {
    setAnchorEl(null);
    if (provider.isActive && provider.model === model) return;

    try {
      const res = await updateProviderMutation({ providerId: provider.id, data: { isActive: true, model } });
      updateProviders((providers ?? []).map((item) => (item.id === res.id ? res : { ...item, isActive: false })));
    } catch {
      /* ignored */
    }
  };

  const handleManage = (): void => {
    setAnchorEl(null);
    openSettings({ section: 3, aiTab: 'providers', highlightId: 'ai.providers' });
  };

  const selectable = (providers ?? []).filter((item) => isProviderReady(item) && item.models.length > 0);

  return (
    <ProvidersStyled>
      <Tooltip
        title={active ? `${PROVIDER_NAMES[active.type]} · ${active.model}` : locales.ai_select_model}
        enterDelay={700}
      >
        <ModelButtonStyled
          size='small'
          disabled={isPending}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          data-testid='ai-model-picker'
        >
          <span className='model-label'>{active ? active.model : locales.ai_select_model}</span>
          <CustomIcon type='chevronDown' size='xs' />
        </ModelButtonStyled>
      </Tooltip>
      {active && mode === 'agent' && (
        <Tooltip
          enterDelay={500}
          title={
            activeCaps.tools
              ? `${locales.ai_tools_supported_desc}${activeCaps.contextWindow ? ` · ${formatContextWindow(activeCaps.contextWindow)}` : ''}`
              : locales.ai_no_tools_desc
          }
        >
          {/* An icon keeps the footer narrow; the label stays for screen readers. */}
          <CapabilityIconStyled
            data-testid='ai-model-capability'
            data-tools={activeCaps.tools}
            warn={!activeCaps.tools}
          >
            <CustomIcon type={activeCaps.tools ? 'check' : 'stop'} size='xs' />
            <VisuallyHidden>
              {activeCaps.tools
                ? `${locales.ai_tools_supported}${activeCaps.contextWindow ? ` · ${formatContextWindow(activeCaps.contextWindow)}` : ''}`
                : locales.ai_no_tools}
            </VisuallyHidden>
          </CapabilityIconStyled>
        </Tooltip>
      )}
      <Menu
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { maxHeight: 360, minWidth: 240 } } }}
      >
        {selectable.flatMap((provider) => [
          <ListSubheader
            disableSticky
            key={`h-${provider.id}`}
            sx={{ lineHeight: '28px', fontSize: variables.fontSize.xs }}
          >
            {PROVIDER_NAMES[provider.type]}
          </ListSubheader>,
          ...provider.models.map((model) => (
            <MenuItem
              key={`${provider.id}-${model}`}
              dense
              selected={provider.isActive && provider.model === model}
              onClick={() => void handleSelect(provider, model)}
              sx={{ gap: 1, justifyContent: 'space-between' }}
            >
              <Typography variant='body2' noWrap>
                {model}
              </Typography>
              <CapabilityBadge provider={provider} model={model} />
            </MenuItem>
          ))
        ])}
        <Divider />
        <MenuItem dense onClick={handleManage} data-testid='ai-manage-providers'>
          <Typography variant='body2' color='textSubdued'>
            {locales.ai_manage_providers}
          </Typography>
        </MenuItem>
      </Menu>
    </ProvidersStyled>
  );
}
