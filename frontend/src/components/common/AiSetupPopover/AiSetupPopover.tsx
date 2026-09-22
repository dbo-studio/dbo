import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { getAiStatus, providerNeedsApiKey, providerNeedsUrl } from '@/core/ai/aiStatus';
import { canManageAiSettings } from '@/core/auth/permissions';
import { openSettings } from '@/core/settings/openSettings';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useAuthStore } from '@/store/authStore/auth.store';
import type { AiProviderType } from '@/types';
import { Button, Link, Popover, Stack, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { AiSetupFormStyled } from './AiSetupPopover.styled';

type AiSetupPopoverProps = {
  open: boolean;
  anchorEl?: HTMLElement | null;
  onClose?: () => void;
  onReady?: () => void;
};

export default function AiSetupPopover({ open, anchorEl, onClose, onReady }: AiSetupPopoverProps) {
  const providers = useAiStore((state) => state.providers);
  const updateProviders = useAiStore((state) => state.updateProviders);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canEdit = canManageAiSettings(mode, user);
  const status = getAiStatus(providers);
  const [selectedId, setSelectedId] = useState<number | undefined>();
  const [apiKey, setApiKey] = useState('');
  const [url, setUrl] = useState('');
  const [modelDraft, setModelDraft] = useState('');
  const [modelError, setModelError] = useState<string | undefined>();
  const [model, setModel] = useState('');

  const selected = providers?.find((item) => item.id === selectedId) ?? status.provider ?? providers?.[0];
  const modelOptions = selected?.models ?? [];
  const selectedModel = model || selected?.model || modelOptions[0] || '';

  const { mutateAsync: saveMutation, isPending } = useMutation({
    mutationFn: async (provider: AiProviderType) => {
      const nextModel = (selectedModel || modelDraft).trim();
      if (!nextModel) {
        setModelError(locales.ai_model_required);
        throw new Error(locales.ai_model_required);
      }

      setModelError(undefined);

      const models = provider.models.includes(nextModel) ? provider.models : [...provider.models, nextModel];
      const payload: Parameters<typeof api.aiProvider.updateProvider>[1] = {
        isActive: true,
        model: nextModel,
        models
      };

      if (providerNeedsApiKey(provider)) {
        if (!apiKey.trim()) {
          throw new Error(locales.api_key_required);
        }
        payload.apiKey = apiKey;
      }

      if (providerNeedsUrl(provider) || (provider.type === 'ollama' && url)) {
        payload.url = url || provider.url;
      }

      return api.aiProvider.updateProvider(provider.id, payload);
    }
  });

  const handleProviderChange = (option: SelectInputOption): void => {
    const next = providers?.find((item) => item.id === Number(option.value));
    if (!next) return;

    setSelectedId(next.id);
    setModel(next.model || next.models[0] || '');
    setModelDraft('');
    setApiKey('');
    setUrl(next.url ?? '');
  };

  const handleSave = async (): Promise<void> => {
    if (!selected) return;

    try {
      const updated = await saveMutation(selected);
      const nextProviders = (providers ?? []).map((item) =>
        item.id === updated.id ? updated : { ...item, isActive: false }
      );
      updateProviders(nextProviders);
      onReady?.();
      onClose?.();
    } catch {
      /* validation or request failed */
    }
  };

  const handleAdvanced = (): void => {
    onClose?.();
    openSettings({ section: 3, aiTab: 'providers', highlightId: 'ai.providers' });
  };

  const form = !canEdit ? (
    <AiSetupFormStyled data-testid='ai-setup-form'>
      <Typography variant='subtitle2'>{locales.ai_setup_title}</Typography>
      <Typography variant='body2' color='text.secondary'>
        {locales.ai_providers_no_permission}
      </Typography>
    </AiSetupFormStyled>
  ) : (
    <AiSetupFormStyled data-testid='ai-setup-form'>
      <Typography variant='subtitle2'>{locales.ai_setup_title}</Typography>
      <SelectInput
        size='small'
        label={locales.provider}
        testId='ai-setup-provider'
        value={selected?.id.toString()}
        options={providers?.map((item) => ({ label: item.type, value: item.id.toString() })) ?? []}
        onChange={(value) => handleProviderChange(value as SelectInputOption)}
      />
      {modelOptions.length > 0 ? (
        <SelectInput
          size='small'
          label={locales.model}
          testId='ai-setup-model'
          value={selectedModel}
          options={modelOptions.map((item) => ({ label: item, value: item }))}
          onChange={(value) => setModel((value as SelectInputOption).value as string)}
        />
      ) : (
        <FieldInput
          label={locales.model}
          value={modelDraft}
          error={!!modelError}
          helpertext={modelError}
          onChange={(e) => setModelDraft(e.target.value)}
          inputProps={{ 'data-testid': 'ai-setup-model' }}
        />
      )}
      {providerNeedsApiKey(selected) && (
        <FieldInput
          label={locales.api_key}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          inputProps={{ 'data-testid': 'ai-setup-api-key' }}
        />
      )}
      {selected?.type === 'ollama' && providerNeedsUrl(selected) && (
        <FieldInput
          label={locales.url}
          value={url || selected.url}
          onChange={(e) => setUrl(e.target.value)}
          inputProps={{ 'data-testid': 'ai-setup-url' }}
        />
      )}
      <Stack direction='row' spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Link
          component='button'
          type='button'
          variant='caption'
          onClick={handleAdvanced}
          data-testid='ai-setup-advanced'
        >
          {locales.ai_advanced_settings}
        </Link>
        <Button
          size='small'
          variant='contained'
          disabled={isPending || !selected}
          loading={isPending}
          onClick={() => void handleSave()}
          data-testid='ai-setup-save'
        >
          {locales.save}
        </Button>
      </Stack>
    </AiSetupFormStyled>
  );

  if (anchorEl) {
    return (
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {form}
      </Popover>
    );
  }

  if (!open) {
    return null;
  }

  return form;
}
