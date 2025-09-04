import api from '@/api';
import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import FieldInput from '@/components/base/FieldInput/FieldInput';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import locales from '@/locales';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { AiProviderType } from '@/types';
import { Box, Button, Chip, IconButton, Stack } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AiPanel() {
  const providers = useAiStore((state) => state.providers);
  const updateProvider = useAiStore((state) => state.updateProvider);
  const [provider, setProvider] = useState<AiProviderType | undefined>(providers?.[0]);
  const [newModel, setNewModel] = useState<string>('');

  const [error, setError] = useState<{
    apiKey: string | undefined;
    url: string | undefined;
    timeout: string | undefined;
  }>({
    apiKey: undefined,
    url: undefined,
    timeout: undefined
  });

  const { mutateAsync: updateProviderMutation, isPending: pendingUpdateProvider } = useMutation({
    mutationFn: async (provider: AiProviderType): Promise<AiProviderType> => {
      setError({
        apiKey: undefined,
        url: undefined,
        timeout: undefined
      });

      if (!provider?.apiKey || provider?.apiKey.length === 0) {
        setError({ ...error, apiKey: locales.api_key_required });
        return provider;
      }

      if (!provider?.url || provider?.url.length === 0) {
        setError({ ...error, url: locales.url_required });
        return provider;
      }

      const updatedProvider = await api.aiProvider.updateProvider(provider.id, {
        apiKey: provider.apiKey,
        url: provider.url,
        timeout: provider.timeout,
        models: provider.models
      });
      setNewModel('');
      updateProvider(updatedProvider);
      setProvider(updatedProvider);
      toast.success(locales.changes_saved_successfully);
      return updatedProvider;
    }
  });

  const handleSubmit = () => {
    try {
      updateProviderMutation(provider as AiProviderType);
    } catch (error) {
      console.debug('🚀 ~ handleSubmit ~ error:', error);
    }
  };

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
        onChange={(e) => setProvider({ ...provider, apiKey: e.target.value } as AiProviderType)}
        helpertext={error.apiKey}
        error={!!error.apiKey}
      />

      <FieldInput
        label={locales.url}
        value={provider?.url}
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
        onChange={(e) =>
          setProvider({
            ...provider,
            timeout: Number.parseInt(e.target.value)
          } as AiProviderType)
        }
      />

      <Stack direction={'row'} alignItems={'center'} spacing={1}>
        <Box flex={1}>
          <FieldInput label={locales.add_model} onChange={(e) => setNewModel(e.target.value)} value={newModel} />
        </Box>
        <Box>
          <IconButton
            onClick={() => {
              setProvider({
                ...provider,
                models: [...(provider?.models ?? []), newModel]
              } as AiProviderType);
            }}
          >
            <CustomIcon type='plus' />
          </IconButton>
        </Box>
      </Stack>

      <Stack direction={'row'} spacing={1}>
        {provider?.models.map((model) => (
          <Chip
            key={model}
            label={model}
            onDelete={() => {
              setProvider({
                ...provider,
                models: provider?.models?.filter((m) => m !== model) ?? []
              } as AiProviderType);
            }}
          />
        ))}
      </Stack>

      <Box display={'flex'} mt={2} justifyContent={'space-between'}>
        <Button
          fullWidth
          loadingPosition='start'
          disabled={pendingUpdateProvider}
          loading={pendingUpdateProvider}
          onClick={handleSubmit}
          size='small'
          variant='contained'
        >
          <span>{locales.save}</span>
        </Button>
      </Box>
    </Box>
  );
}
