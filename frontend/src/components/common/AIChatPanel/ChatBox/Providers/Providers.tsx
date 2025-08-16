import SelectInput from '@/components/base/SelectInput/SelectInput';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Stack } from '@mui/material';
import { useEffect } from 'react';

export default function Providers() {
  const providers = useAiStore((state) => state.providers);
  const currentProvider = useAiStore((state) => state.currentProvider);

  const getCurrentModel = useAiStore((state) => state.getCurrentModel);
  const updateCurrentProvider = useAiStore((state) => state.updateCurrentProvider);
  const updateCurrentModel = useAiStore((state) => state.updateCurrentModel);

  const handleProviderChange = (providerType: string) => {
    const provider = providers?.find((provider) => provider.type === providerType);
    if (provider) {
      updateCurrentProvider(provider);
    }
  };

  useEffect(() => {
    if (providers?.length && !currentProvider) {
      updateCurrentProvider(providers[0]);
    }

    if (currentProvider?.models && !getCurrentModel(currentProvider.type)) {
      updateCurrentModel(currentProvider.type, currentProvider.models[0]);
    }
  }, [providers, currentProvider]);

  return (
    <Stack direction={'row'} spacing={1}>
      <SelectInput
        size='small'
        options={providers?.map((provider) => ({ label: provider.type, value: provider.type })) ?? []}
        onChange={(option) => handleProviderChange(option.value)}
        value={currentProvider?.type}
      />
      <SelectInput
        size='small'
        options={currentProvider?.models?.map((model) => ({ label: model, value: model })) ?? []}
        onChange={(option) => updateCurrentModel(currentProvider?.type ?? '', option.value)}
        value={getCurrentModel(currentProvider?.type ?? '')}
      />
    </Stack>
  );
}
