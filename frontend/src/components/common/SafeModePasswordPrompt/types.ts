import type { SafeModePasswordMode } from '@/store/safeModePassword/safeModePassword.store';

export type SafeModePasswordPromptProps = {
  open: boolean;
  mode: SafeModePasswordMode;
  onCancel: () => void;
  onPassword: (password: string, confirm?: string, currentPassword?: string) => Promise<void> | void;
};
