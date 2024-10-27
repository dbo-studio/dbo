import ThemePanel from '@/components/common/Settings/ThemePanel/ThemePanel.tsx';
import locales from '@/locales';
import * as setting from '@/store/settingStore/setting.store.ts';
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';

describe('ThemePanel.tsx', () => {
  const spy = vi.spyOn(setting, 'useSettingStore');
  const mockUpdateIsDark = vi.fn();

  test('should render the the theme panel', () => {
    render(
      <BrowserRouter>
        <ThemePanel />
      </BrowserRouter>
    );

    expect(screen.queryByText(locales.theme)).not.toBeNull();
    expect(screen.queryByText(locales.select_theme_description)).not.toBeNull();
  });

  test('should change theme after click on ThemeItem', async () => {
    spy.mockReturnValue({
      isDark: true,
      updateIsDark: mockUpdateIsDark
    });

    render(
      <BrowserRouter>
        <ThemePanel />
      </BrowserRouter>
    );

    const lightTheme = screen.queryByText(locales.light);
    expect(lightTheme).not.toBeNull();
    if (!lightTheme) {
      return;
    }

    await userEvent.click(lightTheme);
    expect(mockUpdateIsDark).toHaveBeenCalledWith(false);
  });
});
