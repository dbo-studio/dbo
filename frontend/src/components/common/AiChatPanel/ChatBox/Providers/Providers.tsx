import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import { formatContextWindow, getModelCapabilities } from '@/core/ai/modelCapabilities';
import { openSettings } from '@/core/settings/openSettings';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { AiProviderType } from '@/types';
import { Chip, Divider, ListSubheader, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { useAiChatMode } from '../../hooks/useAiChatMode';
import { ModelButtonStyled, ProvidersStyled } from './Providers.styled';

const badgeSx = { height: 18, fontSize: '0.625rem', '& .MuiChip-label': { px: 0.75 } };

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

  const selectable = (providers ?? []).filter((item) => item.models.length > 0);

  return (
    <ProvidersStyled>
      <Tooltip title={locales.ai_select_model}>
        <ModelButtonStyled
          size='small'
          disabled={isPending}
          onClick={(event) => setAnchorEl(event.currentTarget)}
          data-testid='ai-model-picker'
        >
          <span className='model-label'>
            {active ? `${active.type} · ${active.model}` : locales.ai_select_model}
          </span>
          <CustomIcon type='chevronDown' size='xs' />
        </ModelButtonStyled>
      </Tooltip>
      {active && mode === 'agent' && (
        <Tooltip title={activeCaps.tools ? locales.ai_tools_supported_desc : locales.ai_no_tools_desc}>
          <span data-testid='ai-model-capability'>
            {activeCaps.tools ? (
              <CapabilityBadge provider={active} model={active.model} />
            ) : (
              <Chip size='small' variant='outlined' color='warning' label={locales.ai_no_tools} sx={badgeSx} />
            )}
          </span>
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
          <ListSubheader key={`h-${provider.id}`} sx={{ lineHeight: '28px', fontSize: '0.6875rem' }}>
            {provider.type}
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
