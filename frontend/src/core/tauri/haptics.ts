import { tools } from '@/core/utils/tools';

type HapticsPlugin = typeof import('@tauri-apps/plugin-haptics');

let plugin: Promise<HapticsPlugin | null> | undefined;

// The plugin only exists in Tauri mobile builds; everywhere else this resolves to null and every call is a no-op.
const loadPlugin = (): Promise<HapticsPlugin | null> => {
  plugin ??= tools
    .isTauri()
    .then((inTauri) => (inTauri ? import('@tauri-apps/plugin-haptics') : null))
    .catch(() => null);
  return plugin;
};

const run = async (feedback: (haptics: HapticsPlugin) => Promise<unknown>): Promise<void> => {
  const haptics = await loadPlugin();
  if (!haptics) return;
  // Desktop Tauri builds have no haptics command, so a rejection is expected there.
  await feedback(haptics).catch(() => undefined);
};

export const haptics = {
  selection: (): Promise<void> => run((h) => h.selectionFeedback()),
  impact: (): Promise<void> => run((h) => h.impactFeedback('light'))
};
