import SafeModePasswordPrompt from '@/components/common/SafeModePasswordPrompt/SafeModePasswordPrompt';
import { useCurrentConnection } from '@/hooks';
import { useSafeModePasswordStore } from '@/store/safeModePassword/safeModePassword.store';
import type { JSX } from 'react';

export default function SafeModePasswordHost(): JSX.Element {
  const open = useSafeModePasswordStore((s) => s.open);
  const connectionId = useSafeModePasswordStore((s) => s.connectionId);
  const cancel = useSafeModePasswordStore((s) => s.cancel);
  const submitPassword = useSafeModePasswordStore((s) => s.submitPassword);
  const currentConnection = useCurrentConnection();

  return (
    <SafeModePasswordPrompt
      open={open}
      connectionId={connectionId ?? currentConnection?.id}
      onCancel={cancel}
      onPassword={async (password): Promise<void> => {
        submitPassword(password);
      }}
    />
  );
}
