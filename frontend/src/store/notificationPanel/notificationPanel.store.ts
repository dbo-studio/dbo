import { create } from 'zustand';

/** Lets other places (the status bar) open the header's notification panel. */
type NotificationPanelState = { open: boolean; setOpen: (open: boolean) => void };

export const useNotificationPanelStore = create<NotificationPanelState>()((set) => ({
  open: false,
  setOpen: (open): void => set({ open })
}));
