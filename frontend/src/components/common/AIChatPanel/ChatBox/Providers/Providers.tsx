import SelectInput from '@/components/base/SelectInput/SelectInput';
import { useAiStore } from '@/store/aiStore/ai.store';
import { Stack } from '@mui/material';

export default function Providers() {
  const providers = useAiStore((state) => state.providers);
  const currentChat = useAiStore((state) => state.currentChat);
  const updateCurrentChat = useAiStore((state) => state.updateCurrentChat);

  if (!currentChat) return null;

  return (
    <Stack direction={'row'} spacing={1}>
      <SelectInput
        size='small'
        options={
          providers?.map((provider) => ({
            label: provider.type,
            value: provider.id.toString()
          })) ?? []
        }
        onChange={(option) => updateCurrentChat({ ...currentChat, providerId: option.value })}
        value={currentChat?.providerId.toString()}
      />
      <SelectInput
        size='small'
        options={
          providers
            ?.find((provider) => provider.id === Number(currentChat?.providerId))
            ?.models?.map((model) => ({
              label: model,
              value: model
            })) ?? []
        }
        onChange={(option) => updateCurrentChat({ ...currentChat, model: option.value })}
        value={currentChat?.model}
      />
    </Stack>
  );
}
