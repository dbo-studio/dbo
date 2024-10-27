import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import Leading from './Leading';

describe('Leading.tsx', () => {
  test('should render the the Leading', () => {
    render(
      <MemoryRouter>
        <Leading />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('settings')).not.toBeNull();
  });

  test('should open settings', async () => {
    render(
      <MemoryRouter>
        <Leading />
      </MemoryRouter>
    );

    await userEvent.click(screen.getByLabelText('settings'));
  });
});
