import { renderWithProviders, resetAllMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import AppHeader from './AppHeader';

describe('AppHeader.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render the App Header', () => {
    renderWithProviders(<AppHeader />);
    expect(screen.getByLabelText('settings')).not.toBeNull();
  });
});
