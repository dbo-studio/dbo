import api from '@/api';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { AIProvider } from '@/types/AiProvider';
import { Box, Button } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AiPanel() {
  const providers = useAiStore((state) => state.providers);
  const updateProvider = useAiStore((state) => state.updateProvider);
  const [provider, setProvider] = useState<AIProvider | undefined>(providers?.[0]);
  const [error, setError] = useState<{
    apiKey: string | undefined;
    url: string | undefined;
  }>({
    apiKey: undefined,
    url: undefined
  });

  const { mutateAsync: updateProviderMutation, isPending: pendingUpdateProvider } = useMutation({
    mutationFn: async (provider: AIProvider): Promise<AIProvider> => {
      setError({
        apiKey: undefined,
        url: undefined
      });

      if (!provider?.apiKey || provider?.apiKey.length === 0) {
        setError({ ...error, apiKey: locales.api_key_required });
        return provider;
      }

      if (!provider?.url || provider?.url.length === 0) {
        setError({ ...error, url: locales.url_required });
        return provider;
      }

      const updatedProvider = await api.aiProvider.updateProvider(provider.id, provider);
      updateProvider(updatedProvider);
      setProvider(updatedProvider);
      toast.success(locales.changes_saved_successfully);
      return updatedProvider;
    },
    onError: (error): void => {
      console.error('🚀 ~ updateConnectionMutation ~ error:', error);
    }
  });

  return (
    <Box p={2} display={'flex'} flexDirection={'column'} gap={2}>
      <SelectInput
        label={locales.provider}
        value={provider?.type}
        onChange={(e) => {
          setProvider(providers?.find((p) => p.type === e.value) ?? providers?.[0]);
        }}
        options={providers?.map((m) => ({ label: m.type, value: m.type })) ?? []}
      />

      <FieldInput
        label={locales.api_key}
        value={provider?.apiKey ?? ''}
        onChange={(e) => setProvider({ ...provider, apiKey: e.target.value } as AIProvider)}
        helpertext={error.apiKey}
        error={!!error.apiKey}
      />

      <FieldInput
        label={locales.url}
        value={provider?.url}
        onChange={(e) => setProvider({ ...provider, url: e.target.value } as AIProvider)}
        helpertext={error.url}
        error={!!error.url}
      />

      <FieldInput
        placeholder='0.2'
        type='number'
        label={locales.temperature}
        typelabel={`${locales.max} 1.0`}
        value={provider?.temperature ?? ''}
        onChange={(e) => setProvider({ ...provider, temperature: Number.parseFloat(e.target.value) } as AIProvider)}
      />

      <FieldInput
        placeholder='512'
        typelabel={`${locales.max} 10000`}
        type='number'
        label={locales.max_tokens}
        value={provider?.maxTokens ?? ''}
        onChange={(e) => setProvider({ ...provider, maxTokens: Number.parseInt(e.target.value) } as AIProvider)}
      />

      <Box display={'flex'} mt={2} justifyContent={'space-between'}>
        <Button
          fullWidth
          loadingPosition='start'
          disabled={pendingUpdateProvider}
          loading={pendingUpdateProvider}
          onClick={(): void => {
            updateProviderMutation(provider as AIProvider);
          }}
          size='small'
          variant='contained'
        >
          <span>{locales.save}</span>
        </Button>
      </Box>
    </Box>
  );
}
