import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import { isProviderReady } from '@/core/ai/aiStatus';
import { validateProvider } from '@/core/ai/providerValidation';
import { canManageAiSettings } from '@/core/auth/permissions';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import { useAuthStore } from '@/store/authStore/auth.store';
import type { AiProviderType } from '@/types';
import { Alert, Button, Chip, InputAdornment, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState, type JSX } from 'react';
import { toast } from 'sonner';
import {
  AiPanelFooterStyled,
  AiPanelFormStyled,
  AiProviderItemStyled,
  AiProviderListStyled
} from './AiProviders.styled';
import ModelPicker from './ModelPicker';

function providerStatus(provider: AiProviderType): { label: string; color: 'success' | 'default' | 'warning' } {
  if (provider.isActive && isProviderReady(provider)) {
    return { label: locales.ai_provider_in_use, color: 'success' };
  }

  if (isProviderReady(provider)) {
    return { label: locales.ai_status_ready, color: 'default' };
  }

  return { label: locales.ai_provider_needs_key, color: 'warning' };
}

type ProviderFormProps = { provider: AiProviderType; canEdit: boolean };

function ProviderForm({ provider, canEdit }: ProviderFormProps): JSX.Element {
  const updateProviders = useAiStore((state) => state.updateProviders);
  const [url, setUrl] = useState(provider.url);
  const [apiKey, setApiKey] = useState(provider.apiKey ?? '');
  const [timeout, setTimeout] = useState(provider.timeout?.toString() ?? '');
  const [model, setModel] = useState(provider.model);
  const [models, setModels] = useState(provider.models);
  const [showKey, setShowKey] = useState(false);
  const [touched, setTouched] = useState(false);
  const [connection, setConnection] = useState<{ ok: boolean; text: string } | undefined>();

  const keySaved = apiKey.startsWith('****');
  const timeoutValue = timeout.trim() === '' ? undefined : Number(timeout);
  const errors = validateProvider({ type: provider.type, url, apiKey, timeout: timeoutValue, model });
  const invalid = Object.keys(errors).length > 0;
  const shown = (field: keyof typeof errors): string | undefined => (touched ? errors[field] : undefined);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () =>
      api.aiProvider.updateProvider(provider.id, {
        url: url.trim(),
        apiKey,
        timeout: timeoutValue,
        models: models.includes(model) ? models : [...models, model],
        model,
        isActive: true
      }),
    onSuccess: (updated) => {
      updateProviders(
        (useAiStore.getState().providers ?? []).map((item) =>
          item.id === updated.id ? updated : { ...item, isActive: false }
        )
      );
      toast.success(locales.changes_saved_successfully);
    }
  });

  const { mutate: testConnection, isPending: testing } = useMutation({
    mutationFn: () =>
      api.aiProvider.listProviderModels(provider.id, { url: url.trim(), apiKey, timeout: timeoutValue }),
    onSuccess: (result) => {
      if (result.error) {
        setConnection({ ok: false, text: result.error });
        return;
      }

      setModels(result.models);
      setConnection({ ok: true, text: locales.ai_connection_ok.replace('{{count}}', String(result.models.length)) });
    }
  });

  const handleTest = (): void => {
    setTouched(true);
    if (errors.url || errors.apiKey || errors.timeout) return;
    setConnection(undefined);
    testConnection();
  };

  const handleSave = (): void => {
    setTouched(true);
    if (!invalid) save();
  };

  return (
    <AiPanelFormStyled
      component='form'
      noValidate
      data-testid='ai-provider-form'
      onSubmit={(e): void => {
        e.preventDefault();
        handleSave();
      }}
    >
      <FieldInput
        label={locales.url}
        value={url}
        disabled={!canEdit}
        error={!!shown('url')}
        helpertext={shown('url')}
        onChange={(e) => setUrl(e.target.value)}
        inputProps={{ 'data-testid': 'ai-provider-url' }}
      />

      <FieldInput
        label={locales.api_key}
        type={showKey || keySaved ? 'text' : 'password'}
        value={apiKey}
        disabled={!canEdit}
        placeholder={provider.type === 'ollama' ? undefined : 'sk-…'}
        error={!!shown('apiKey')}
        helpertext={shown('apiKey') ?? (keySaved ? locales.ai_key_saved : undefined)}
        onChange={(e) => setApiKey(e.target.value)}
        onFocus={() => keySaved && setApiKey('')}
        inputProps={{ 'data-testid': 'ai-provider-api-key' }}
        endAdornment={
          <InputAdornment position='end'>
            <Button size='small' onClick={() => setShowKey((value) => !value)} data-testid='ai-provider-key-toggle'>
              {showKey ? locales.ai_key_hide : locales.ai_key_show}
            </Button>
          </InputAdornment>
        }
      />

      <FieldInput
        placeholder='30'
        typelabel={`${locales.max} 1000`}
        type='number'
        label={locales.timeout}
        value={timeout}
        disabled={!canEdit}
        error={!!shown('timeout')}
        helpertext={shown('timeout')}
        onChange={(e) => setTimeout(e.target.value)}
        inputProps={{ 'data-testid': 'ai-provider-timeout' }}
      />

      <ModelPicker
        providerType={provider.type}
        value={model}
        options={models}
        disabled={!canEdit}
        error={shown('model')}
        onChange={setModel}
      />

      {connection ? (
        <Alert severity={connection.ok ? 'success' : 'error'} data-testid='ai-connection-result'>
          {connection.text}
        </Alert>
      ) : null}

      {canEdit ? (
        <AiPanelFooterStyled>
          <Button
            type='button'
            size='small'
            variant='outlined'
            loading={testing}
            disabled={saving}
            onClick={handleTest}
            data-testid='ai-provider-test'
          >
            {locales.ai_test_connection}
          </Button>
          <Button
            type='submit'
            size='small'
            variant='contained'
            loading={saving}
            disabled={testing || (touched && invalid)}
            data-testid='ai-provider-save'
          >
            {locales.save}
          </Button>
        </AiPanelFooterStyled>
      ) : null}
    </AiPanelFormStyled>
  );
}

export default function AiProvidersPanel(): JSX.Element {
  const providers = useAiStore((state) => state.providers);
  const mode = useAuthStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const canEdit = canManageAiSettings(mode, user);
  const [selectedId, setSelectedId] = useState<number | undefined>();

  const selected =
    providers?.find((item) => item.id === selectedId) ?? providers?.find((item) => item.isActive) ?? providers?.[0];

  return (
    <>
      <AiProviderListStyled role='tablist' aria-label={locales.ai_providers_heading}>
        {providers?.map((item) => {
          const status = providerStatus(item);
          return (
            <AiProviderItemStyled
              key={item.id}
              role='tab'
              selected={item.id === selected?.id}
              aria-selected={item.id === selected?.id}
              onClick={() => setSelectedId(item.id)}
              data-testid={`ai-provider-${item.type}`}
            >
              <Typography variant='subtitle2' sx={{ textTransform: 'capitalize' }}>
                {item.type}
              </Typography>
              <Chip
                size='small'
                color={status.color}
                label={status.label}
                data-testid={`ai-provider-status-${item.type}`}
              />
            </AiProviderItemStyled>
          );
        })}
      </AiProviderListStyled>

      {selected ? <ProviderForm key={selected.id} provider={selected} canEdit={canEdit} /> : null}
    </>
  );
}
