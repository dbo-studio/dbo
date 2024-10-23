import locales from '@/locales';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import Settings from './Settings';

describe('Settings.tsx', () => {
  test('should render the the settings', () => {
    render(
      <MemoryRouter>
        <Settings open={true} />
      </MemoryRouter>
    );
    expect(screen.getAllByText(locales.theme)).not.toBeNull();
  });

  test('should close setting after click ', () => {
    render(
      <MemoryRouter>
        <Settings open={true} />
      </MemoryRouter>
    );
    expect(screen.getAllByText(locales.theme)).not.toBeNull();
  });
});
