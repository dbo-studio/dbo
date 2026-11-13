import { useSelectedTab } from '@/hooks';
import Segmented from '@/components/base/Segmented/Segmented';
import { variables } from '@/core/theme/variables';
import { Box } from '@mui/material';
import { type JSX, type ReactNode, useState } from 'react';

export type SettingsSubTab = {
  id: string;
  label: string;
  /** Shown beside the label, e.g. how many items the tab holds. */
  count?: number;
  /** Settings-search ids that live in this tab; a search hit on one of them opens the tab. */
  ids?: string[];
  content: ReactNode;
};

type Props = { tabs: SettingsSubTab[]; initial?: string };

/** Splits one settings section into a few related groups, one visible at a time. */
export default function SettingsTabs({ tabs, initial }: Props): JSX.Element {
  const [selected, setSelected] = useState(initial ?? tabs[0]?.id);
  const highlightId = (useSelectedTab() as { highlightId?: string } | undefined)?.highlightId;
  const target = highlightId ? tabs.find((t) => t.ids?.includes(highlightId))?.id : undefined;
  const [seen, setSeen] = useState(highlightId);

  // A search hit inside another tab opens that tab (render-time sync, so the target is mounted before it scrolls).
  if (highlightId !== seen) {
    setSeen(highlightId);
    if (target && target !== selected) setSelected(target);
  }

  const active = tabs.find((t) => t.id === selected) ?? tabs[0];

  return (
    <Box>
      <Segmented
        value={active.id}
        onChange={setSelected}
        testId='settings-tab'
        options={tabs.map((t) => ({ value: t.id, label: t.count ? `${t.label} · ${t.count}` : t.label }))}
      />
      <Box
        key={active.id}
        role='tabpanel'
        data-settings-id={active.ids?.[0]}
        sx={{
          pt: 2.5,
          animation: `settingsTabIn ${variables.motion.base} ${variables.motion.easing}`,
          '@keyframes settingsTabIn': {
            from: { opacity: 0, transform: 'translateY(4px)' },
            to: { opacity: 1, transform: 'none' }
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
        }}
      >
        {active.content}
      </Box>
    </Box>
  );
}
