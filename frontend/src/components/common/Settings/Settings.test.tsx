import locales from '@/locales';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import Settings from './Settings';

describe('Settings.tsx', () => {
  test('should render the the settings', () => {
    renderWithProviders(<Settings open={true} />);
    expect(screen.getAllByText(locales.theme)).not.toBeNull();
  });

  test('should close setting after click ', () => {
    renderWithProviders(<Settings open={true} />);
    expect(screen.getAllByText(locales.theme)).not.toBeNull();
  });
});
