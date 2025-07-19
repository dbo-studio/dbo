import locales from '@/locales';
import { renderWithProviders, resetAllMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import AboutPanel from './AboutPanel';

describe('AboutPanel.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render the about panel', () => {
    renderWithProviders(<AboutPanel />);
    expect(screen.getAllByText(locales.releases_url)).not.toBeNull();
    expect(screen.getAllByText(locales.report_an_issue)).not.toBeNull();
  });

  test('should show app version when platform is desktop', () => {
    process.env.VITE_VERSION = 'VITE_VERSION';

    renderWithProviders(<AboutPanel />);
    expect(screen.getAllByText('VITE_VERSION')).not.toBeNull();
  });
});
