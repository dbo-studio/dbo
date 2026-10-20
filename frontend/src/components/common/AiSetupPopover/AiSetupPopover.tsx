import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { getAiStatus } from '@/core/ai/aiStatus';
import { validateProvider } from '@/core/ai/providerValidation';
import { canManageAiSettings } from '@/core/auth/permissions';
import { openSettings } from '@/core/settings/openSettings';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useAuthStore } from '@/store/authStore/auth.store';
import type { AiProviderType } from '@/types';
import { Button, Link, Popover, Stack, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import ModelPicker from '../Settings/AiPanel/AiProvidersPanel/ModelPicker';
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
  const [url, setUrl] = useState<string | undefined>();
  const [model, setModel] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);

  const selected = providers?.find((item) => item.id === selectedId) ?? status.provider ?? providers?.[0];
  const currentUrl = url ?? selected?.url ?? '';
  const currentModel = model ?? (selected?.model || selected?.models[0]) ?? '';
  const currentKey = apiKey || selected?.apiKey || '';
  const errors = selected
    ? validateProvider({
        type: selected.type,
        url: currentUrl,
        apiKey: currentKey,
        timeout: selected.timeout,
        model: currentModel
      })
    : {};

  const { mutateAsync: saveMutation, isPending } = useMutation({
    mutationFn: (provider: AiProviderType) =>
      api.aiProvider.updateProvider(provider.id, {
        isActive: true,
        url: currentUrl.trim(),
        model: currentModel,
        models: provider.models.includes(currentModel) ? provider.models : [...provider.models, currentModel],
        ...(apiKey ? { apiKey } : {})
      })
  });

  const handleProviderChange = (option: SelectInputOption): void => {
    setSelectedId(Number(option.value));
    setApiKey('');
    setUrl(undefined);
    setModel(undefined);
    setSubmitted(false);
  };

  const handleSave = async (): Promise<void> => {
    setSubmitted(true);
    if (!selected || Object.keys(errors).length > 0) return;

    try {
      const updated = await saveMutation(selected);
      const nextProviders = (providers ?? []).map((item) =>
        item.id === updated.id ? updated : { ...item, isActive: false }
      );
      updateProviders(nextProviders);
      onReady?.();
      onClose?.();
    } catch {
      /* request failed; the form stays open */
    }
  };

  const shown = (field: keyof typeof errors): string | undefined => (submitted ? errors[field] : undefined);

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
      {selected?.type === 'ollama' && (
        <FieldInput
          label={locales.url}
          value={currentUrl}
          error={!!shown('url')}
          helpertext={shown('url')}
          onChange={(e) => setUrl(e.target.value)}
          inputProps={{ 'data-testid': 'ai-setup-url' }}
        />
      )}
      {selected && selected.type !== 'ollama' && (
        <FieldInput
          label={locales.api_key}
          type='password'
          value={apiKey}
          placeholder={selected.apiKey ? locales.ai_key_saved : 'sk-…'}
          error={!!shown('apiKey')}
          helpertext={shown('apiKey')}
          onChange={(e) => setApiKey(e.target.value)}
          inputProps={{ 'data-testid': 'ai-setup-api-key' }}
        />
      )}
      {selected && (
        <ModelPicker
          providerType={selected.type}
          value={currentModel}
          options={selected.models}
          error={shown('model')}
          onChange={setModel}
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
