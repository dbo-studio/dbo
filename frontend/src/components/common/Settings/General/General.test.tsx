import General from '@/components/common/Settings/General/General';
import locales from '@/locales';
import { createSpy, renderWithProviders, resetAllMocks, setupStoreMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

describe('General.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render the General component', () => {
    setupStoreMocks.settingStore({
      debug: false
    });

    renderWithProviders(<General />);

    expect(screen.queryByText(locales.general)).not.toBeNull();
    expect(screen.queryByText(locales.debug_mode)).not.toBeNull();
    expect(screen.queryByText(locales.enable_debug_console)).not.toBeNull();
  });

  test('should toggle debug mode switch', () => {
    const mockToggleDebug = createSpy();

    setupStoreMocks.settingStore({
      debug: false,
      toggleDebug: mockToggleDebug
    });

    renderWithProviders(<General />);

    const switchElement = screen.getByRole('checkbox');
    fireEvent.click(switchElement);

    expect(mockToggleDebug).toHaveBeenCalledWith(true);
  });

  test('should display the correct initial state of the switch when debug is true', () => {
    setupStoreMocks.settingStore({
      debug: true
    });

    renderWithProviders(<General />);

    expect(screen.queryByRole('checkbox', { checked: true })).not.toBeNull();
  });
});
