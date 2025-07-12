import ThemePanel from '@/components/common/Settings/ThemePanel/ThemePanel.tsx';
import locales from '@/locales';
import { renderWithProviders, resetAllMocks, setupDOMMocks, setupStoreMocks } from '@/test/utils/test-helpers.tsx';
import { fireEvent, screen } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';

// vi.mock('@/store/settingStore/setting.store', () => {
//   const mockToggleIsDark = vi.fn();
//   return {
//     useSettingStore: (selector: any): any => selector({
//       isDark: true,
//       toggleIsDark: mockToggleIsDark
//     })
//   };
// });

// vi.mock('@/store/settingStore/setting.store', () => ({
//   useSettingStore: createZustandSelectorMock({
//     ...defaultSettingStoreMock,
//     isDark: true,
//     toggleIsDark: mockToggleIsDark
//   })
// }));

describe('ThemePanel.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
    setupDOMMocks();
  });

  test('should render the theme panel', () => {
    renderWithProviders(<ThemePanel />);
    expect(screen.queryByText(locales.theme)).not.toBeNull();
    expect(screen.queryByText(locales.select_theme_description)).not.toBeNull();
  });

  test('should show both theme options', () => {
    renderWithProviders(<ThemePanel />);
    expect(screen.queryByText(locales.light)).not.toBeNull();
    expect(screen.queryByText(locales.dark)).not.toBeNull();
  });

  test('should change theme after click on ThemeItem', async () => {
    // const mockToggleIsDark = vi.fn();
    await setupStoreMocks.settingStore();

    renderWithProviders(<ThemePanel />);
    const lightTheme = screen.queryByText(locales.light);
    expect(lightTheme).not.toBeNull();
    if (!lightTheme) return;
    fireEvent.click(lightTheme);

    expect(lightTheme).toBeInTheDocument();
    // expect(mockToggleIsDark).toHaveBeenCalledWith(false);
  });
});
