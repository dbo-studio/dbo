import ShortcutPanel from '@/components/common/Settings/ShortcutPanel/ShortcutPanel.tsx';
import { shortcuts } from '@/core/utils';
import locales from '@/locales';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';

describe('ShortcutPanel.tsx', () => {
  test('should render the the about panel with correct tabs in web', () => {
    render(
      <MemoryRouter>
        <ShortcutPanel />
      </MemoryRouter>
    );
    expect(screen.queryByText(locales.shortcuts)).not.toBeNull();
    Object.entries(shortcuts).map(([_, value]) => {
      expect(screen.queryByText(value.label)).not.toBeNull();
      expect(screen.queryByText(value.command)).not.toBeNull();
    });
  });
});
