export type SafeModePasswordPromptProps = {
  open: boolean;
  connectionId?: number;
  onCancel: () => void;
  onPassword: (password: string) => Promise<void> | void;
};
