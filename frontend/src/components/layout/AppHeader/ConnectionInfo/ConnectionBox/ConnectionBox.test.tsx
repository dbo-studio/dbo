import { connectionDetailModel } from '@/core/mocks/handlers/connections.ts';
import locales from '@/locales';
import { createSpy, renderWithProviders, resetAllMocks, setupStoreMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import ConnectionBox from './ConnectionBox.tsx';

describe('ConnectionBox.tsx', () => {
  const connection = connectionDetailModel;

  beforeEach(() => {
    resetAllMocks();
  });

  test('should show error when state loading', () => {
    setupStoreMocks.connectionStore({
      currentConnection: createSpy().mockReturnValue(null),
      loading: 'loading'
    });

    renderWithProviders(<ConnectionBox />);
    expect(screen.getByText(locales.connecting)).not.toBeNull();
  });

  test('should show error when loading failed', () => {
    setupStoreMocks.connectionStore({
      currentConnection: createSpy().mockReturnValue(null),
      loading: 'error'
    });

    renderWithProviders(<ConnectionBox />);
    expect(screen.getByText(locales.connection_error)).not.toBeNull();
  });

  test('should render the connection box', () => {
    setupStoreMocks.connectionStore({
      currentConnection: createSpy().mockReturnValue(null),
      loading: 'finished'
    });

    renderWithProviders(<ConnectionBox />);
    expect(screen.getByText(locales.no_active_connection)).not.toBeNull();
  });

  test('should with connection', () => {
    setupStoreMocks.connectionStore({
      currentConnection: createSpy().mockReturnValue(connection),
      loading: 'finished'
    });

    renderWithProviders(<ConnectionBox />);

    expect(screen.getByRole('heading', { level: 6 })).not.toBeNull();
  });
});
