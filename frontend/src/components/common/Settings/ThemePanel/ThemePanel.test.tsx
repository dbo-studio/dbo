import ThemePanel from '@/components/common/Settings/ThemePanel/ThemePanel.tsx';
import locales from '@/locales';
import { createSpy, renderWithProviders, resetAllMocks, setupStoreMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';

describe('ThemePanel.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should render the theme panel', () => {
    renderWithProviders(<ThemePanel />);

    expect(screen.queryByText(locales.theme)).not.toBeNull();
    expect(screen.queryByText(locales.select_theme_description)).not.toBeNull();
  });

  test('should change theme after click on ThemeItem', async () => {
    const mockToggleIsDark = createSpy();

    setupStoreMocks.settingStore({
      isDark: true,
      toggleIsDark: mockToggleIsDark
    });

    renderWithProviders(<ThemePanel />);

    const lightTheme = screen.queryByText(locales.light);
    expect(lightTheme).not.toBeNull();
    if (!lightTheme) {
      return;
    }

    await userEvent.click(lightTheme);
    expect(mockToggleIsDark).toHaveBeenCalledWith(false);
  });
});
