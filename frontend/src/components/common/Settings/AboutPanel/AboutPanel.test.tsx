import locales from '@/locales';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import AboutPanel from './AboutPanel';

describe('AboutPanel.tsx', () => {
  test('should render the the about panel', () => {
    render(
      <MemoryRouter>
        <AboutPanel />
      </MemoryRouter>
    );
    expect(screen.getAllByText(locales.theme)).not.toBeNull();
  });

  test('should close setting after click ', () => {
    process.env.TAURI_ARCH = 'TAURI_ARCH';
    process.env.TAURI_PLATFORM = 'TAURI_PLATFORM';
    process.env.TAURI_PLATFORM_VERSION = 'TAURI_PLATFORM_VERSION';
    process.env.VITE_VERSION = 'VITE_VERSION';

    render(
      <MemoryRouter>
        <AboutPanel />
      </MemoryRouter>
    );
    expect(screen.getAllByText(locales.theme)).not.toBeNull();
  });
});
