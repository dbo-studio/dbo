import General from '@/components/common/Settings/General/General';
import locales from '@/locales';
import * as setting from '@/store/settingStore/setting.store.ts';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { renderWithProviders } from '@/test/test-utils';
import { screen } from '@testing-library/dom';
import { fireEvent } from '@testing-library/react';
import { describe, expect, vi } from 'vitest';

const spy = vi.spyOn(setting, 'useSettingStore');

describe('General.tsx', () => {
  beforeEach(() => {
    spy.mockReturnValue({
      toggleDebug: vi.fn(),
      debug: false
    });
  });

  it('renders the General component', () => {
    renderWithProviders(<General />);

    expect(screen.queryByText(locales.general)).not.toBeNull();
    expect(screen.queryByText(locales.debug_mode)).not.toBeNull();
    expect(screen.queryByText(locales.enable_debug_console)).not.toBeNull();
  });

  it('toggles debug mode switch', () => {
    const { toggleDebug } = useSettingStore();
    renderWithProviders(<General />);
    const switchElement = screen.getByRole('checkbox');
    fireEvent.click(switchElement);
    expect(toggleDebug).toHaveBeenCalledWith(true);
  });

  it('displays the correct initial state of the switch', () => {
    spy.mockReturnValueOnce({
      updateDebug: vi.fn(),
      debug: true
    });
    renderWithProviders(<General />);

    expect(screen.queryByRole('checkbox', { checked: true })).not.toBeNull();
  });
});
