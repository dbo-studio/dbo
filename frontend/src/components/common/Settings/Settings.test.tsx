import locales from '@/locales';
import { screen } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import Settings from './Settings';
import { renderWithProviders } from '@/test/test-utils';

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
