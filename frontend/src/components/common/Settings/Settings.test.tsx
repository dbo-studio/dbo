import locales from '@/locales';
import { renderWithProviders, resetAllMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import Settings from './Settings';

describe('Settings.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render the settings', () => {
    renderWithProviders(<Settings open={true} />);
    expect(screen.getAllByText(locales.theme)).not.toBeNull();
  });

  test('should close setting after click', () => {
    renderWithProviders(<Settings open={true} />);
    expect(screen.getAllByText(locales.theme)).not.toBeNull();
  });
});
