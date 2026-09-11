import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import { SelectInputOption } from '@/components/base/SelectInput/types';
import { aiStatusLabel, getAiStatus } from '@/core/ai/aiStatus';
import { canManageAiSettings } from '@/core/auth/permissions';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useAuthStore } from '@/store/authStore/auth.store';
import type { AiProviderType } from '@/types';
import { Box, Button, Chip, IconButton, Stack } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { AiPanelFooterStyled, AiPanelFormStyled } from './AiProviders.styled';

export default function AiProvidersPanel() {
  const providers = useAiStore((state) => state.providers);
  const updateProviders = useAiStore((state) => state.updateProviders);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canEdit = canManageAiSettings(mode, user);
  const [provider, setProvider] = useState<AiProviderType | undefined>(providers?.[0]);
  const status = getAiStatus(providers);
  const [newModel, setNewModel] = useState<string>('');

  const [error, setError] = useState<{
    url: string | undefined;
    timeout: string | undefined;
  }>({
    url: undefined,
    timeout: undefined
  });

  const { mutateAsync: updateProviderMutation, isPending: pendingUpdateProvider } = useMutation({
    mutationFn: async (provider: AiProviderType): Promise<AiProviderType> => {
      setError({
        url: undefined,
        timeout: undefined
      });

      if (!provider?.url || provider?.url.length === 0) {
        setError({ ...error, url: locales.url_required });
        return provider;
      }

      const updatedProvider = await api.aiProvider.updateProvider(provider.id, {
        apiKey: provider.apiKey,
        url: provider.url,
        timeout: provider.timeout,
        models: provider.models,
        isActive: true,
        model: provider.model || provider.models[0]
      });
      setNewModel('');
      updateProviders(
        (useAiStore.getState().providers ?? []).map((item) =>
          item.id === updatedProvider.id ? updatedProvider : { ...item, isActive: false }
        )
      );
      setProvider(updatedProvider);
      toast.success(locales.changes_saved_successfully);
      return updatedProvider;
    }
  });

  const handleSubmit = () => {
    updateProviderMutation(provider as AiProviderType).catch(() => undefined);
  };

  const handleAddModel = () => {
    setProvider({
      ...provider,
      models: [...(provider?.models ?? []), newModel]
    } as AiProviderType);
  };

  const handleRemoveModel = (model: string) => {
    setProvider({
      ...provider,
      models: provider?.models?.filter((m) => m !== model) ?? []
    } as AiProviderType);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddModel();
    }
  };

  return (
    <AiPanelFormStyled
      component='form'
      onSubmit={(e): void => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
      }}
    >
      <SelectInput
        label={locales.provider}
        value={provider?.type}
        disabled={!canEdit}
        onChange={(e) => {
          setProvider(providers?.find((p) => p.type === (e as SelectInputOption)?.value) ?? providers?.[0]);
        }}
        options={providers?.map((m) => ({ label: m.type, value: m.type })) ?? []}
      />

      <FieldInput
        label={locales.api_key}
        value={provider?.apiKey ?? ''}
        disabled={!canEdit}
        onChange={(e) => setProvider({ ...provider, apiKey: e.target.value } as AiProviderType)}
      />

      <FieldInput
        label={locales.url}
        value={provider?.url}
        disabled={!canEdit}
        onChange={(e) => setProvider({ ...provider, url: e.target.value } as AiProviderType)}
        helpertext={error.url}
        error={!!error.url}
      />

      <FieldInput
        placeholder='30'
        typelabel={`${locales.max} 1000`}
        type='number'
        label={locales.timeout}
        value={provider?.timeout ?? ''}
        disabled={!canEdit}
        onChange={(e) =>
          setProvider({
            ...provider,
            timeout: Number.parseInt(e.target.value)
          } as AiProviderType)
        }
      />

      {canEdit ? (
        <Stack direction={'row'} spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <FieldInput
              label={locales.add_model}
              onKeyDown={handleKeyDown}
              onChange={(e) => setNewModel(e.target.value)}
              value={newModel}
            />
          </Box>
          <Box>
            <IconButton type='button' onClick={handleAddModel}>
              <CustomIcon type='plus' />
            </IconButton>
          </Box>
        </Stack>
      ) : null}

      <Stack direction={'row'} spacing={1} sx={{ flexWrap: 'wrap' }}>
        {provider?.models.map((model) => (
          <Chip key={model} label={model} onDelete={canEdit ? () => handleRemoveModel(model) : undefined} />
        ))}
      </Stack>

      <SelectInput
        label={locales.model}
        value={provider?.model || provider?.models[0]}
        disabled={!canEdit}
        options={provider?.models.map((model) => ({ label: model, value: model })) ?? []}
        onChange={(e) =>
          setProvider({
            ...provider,
            model: (e as SelectInputOption)?.value as string
          } as AiProviderType)
        }
      />

      <Chip
        size='small'
        color={status.ready ? 'success' : 'warning'}
        label={aiStatusLabel(status)}
        data-testid='ai-status-badge'
      />


      {canEdit ? (
        <AiPanelFooterStyled>
          <Button
            type='submit'
            fullWidth
            loadingPosition='start'
            disabled={pendingUpdateProvider}
            loading={pendingUpdateProvider}
            size='small'
            variant='contained'
          >
            <span>{locales.save}</span>
          </Button>
        </AiPanelFooterStyled>
      ) : null}
    </AiPanelFormStyled>
  );
}
