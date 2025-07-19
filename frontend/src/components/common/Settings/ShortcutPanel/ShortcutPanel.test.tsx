import ShortcutPanel from '@/components/common/Settings/ShortcutPanel/ShortcutPanel.tsx';
import { shortcuts } from '@/core/utils';
import locales from '@/locales';
import { renderWithProviders, resetAllMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';

describe('ShortcutPanel.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render the about panel with correct tabs in web', () => {
    renderWithProviders(<ShortcutPanel />);
    expect(screen.queryByText(locales.shortcuts)).not.toBeNull();
    Object.entries(shortcuts).map(([_, value]) => {
      expect(screen.queryByText(value.label)).not.toBeNull();
      expect(screen.queryByText(value.command)).not.toBeNull();
    });
  });
});
