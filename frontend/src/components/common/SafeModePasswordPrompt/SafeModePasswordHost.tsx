import SafeModePasswordPrompt from '@/components/common/SafeModePasswordPrompt/SafeModePasswordPrompt';
import { useSafeModePasswordStore } from '@/store/safeModePassword/safeModePassword.store';
import type { JSX } from 'react';

export default function SafeModePasswordHost(): JSX.Element {
  const open = useSafeModePasswordStore((s) => s.open);
  const mode = useSafeModePasswordStore((s) => s.mode);
  const cancel = useSafeModePasswordStore((s) => s.cancel);
  const submitPassword = useSafeModePasswordStore((s) => s.submitPassword);

  return (
    <SafeModePasswordPrompt
      key={`${open}-${mode}`}
      open={open}
      mode={mode}
      onCancel={cancel}
      onPassword={submitPassword}
    />
  );
}
