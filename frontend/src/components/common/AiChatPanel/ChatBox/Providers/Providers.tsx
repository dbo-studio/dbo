import api from '@/api';
import SelectInput from '@/components/base/SelectInput/SelectInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import { useAiStore } from '@/store/aiStore/ai.store';
import type { AiProviderType } from '@/types';
import { Box } from '@mui/material';
import { useMutation } from '@tanstack/react-query';

export default function Providers() {
  const providers = useAiStore((state) => state.providers);
  const updateProvider = useAiStore((state) => state.updateProvider);
  const updateProviders = useAiStore((state) => state.updateProviders);
  const provider = providers?.find((item) => item.isActive);

  const { mutateAsync: updateProviderMutation } = useMutation<
    AiProviderType,
    unknown,
    { providerId: number; data: Partial<AiProviderType> }
  >({
    mutationFn: ({ providerId, data }) => api.aiProvider.updateProvider(providerId, data)
  });

  const handleProviderChange = async (option: SelectInputOption) => {
    const selectedProvider = providers?.find((item) => item.id === Number(option.value));
    if (!selectedProvider) return;

    try {
      const res = await updateProviderMutation({ providerId: selectedProvider.id, data: { isActive: true } });
      const updatedProviders = providers?.map((item) =>
        item.id === selectedProvider.id ? res : { ...item, isActive: false }
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
          providers?.map((item) => ({
            label: item.type,
            value: item.id.toString()
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
