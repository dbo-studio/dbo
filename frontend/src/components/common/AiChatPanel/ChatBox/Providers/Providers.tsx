import api from '@/api';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { AiProviderType } from '@/types';
import { Box } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export default function Providers() {
  const [provider, setProvider] = useState<AiProviderType | undefined>();

  const providers = useAiStore((state) => state.providers);
  const updateProvider = useAiStore((state) => state.updateProvider);
  const updateProviders = useAiStore((state) => state.updateProviders);

  useEffect(() => {
    setProvider(providers?.find((provider) => provider.isActive));
  }, [providers]);

  const { mutateAsync: updateProviderMutation } = useMutation<
    AiProviderType,
    unknown,
    { providerId: number; data: Partial<AiProviderType> }
  >({
    mutationFn: ({ providerId, data }) => api.aiProvider.updateProvider(providerId, data)
  });

  const handleProviderChange = async (option: SelectInputOption) => {
    const selectedProvider = providers?.find((provider) => provider.id === Number(option.value));
    if (!selectedProvider) return;

    try {
      const res = await updateProviderMutation({ providerId: selectedProvider.id, data: { isActive: true } });
      const updatedProviders = providers?.map((provider) =>
        provider.id === selectedProvider.id ? res : { ...provider, isActive: false }
      );

      updateProviders(updatedProviders ?? []);
    } catch (error) {
      console.debug('🚀 ~ handleProviderChange ~ error:', error);
    }
  };

  const handleModelChange = async (option: SelectInputOption) => {
    if (!provider) return;

    try {
      const res = await updateProviderMutation({ providerId: provider.id, data: { model: option.value as string } });
      updateProvider(res);
    } catch (error) {
      console.debug('🚀 ~ handleModelChange ~ error:', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        flex: 1,
        minWidth: 0,
        '& .MuiInputBase-root': {
          maxWidth: '100%'
        }
      }}
    >
      <SelectInput
        size='small'
        options={
          providers?.map((provider) => ({
            label: provider.type,
            value: provider.id.toString()
          })) ?? []
        }
        onChange={(value) => void handleProviderChange(value as SelectInputOption)}
        value={provider?.id.toString()}
      />
      <SelectInput
        size='small'
        options={
          provider?.models.map((model) => ({
            label: model,
            value: model
          })) ?? []
        }
        onChange={(value) => void handleModelChange(value as SelectInputOption)}
        value={provider?.model}
      />
    </Box>
  );
}
