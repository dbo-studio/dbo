import { renderWithProviders, resetAllMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import Leading from './Leading.tsx';

describe('Leading.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render the Leading', () => {
    renderWithProviders(<Leading />);
    expect(screen.getByLabelText('settings')).not.toBeNull();
  });

  test('should open settings', async () => {
    renderWithProviders(<Leading />);

    await userEvent.click(screen.getByLabelText('settings'));
  });
});
