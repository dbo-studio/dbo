import { renderWithProviders } from '@/test/test-utils.tsx';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import Leading from './Leading.tsx';

describe('Leading.tsx', () => {
  test('should render the the Leading', () => {
    renderWithProviders(<Leading />);
    expect(screen.getByLabelText('settings')).not.toBeNull();
  });

  test('should open settings', async () => {
    renderWithProviders(<Leading />);

    await userEvent.click(screen.getByLabelText('settings'));
  });
});
