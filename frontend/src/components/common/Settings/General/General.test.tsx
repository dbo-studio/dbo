import { fireEvent, render } from '@testing-library/react';
import General from '@/components/common/Settings/General/General';
import * as setting from '@/store/settingStore/setting.store.ts';
import { useSettingStore } from '@/store/settingStore/setting.store.ts';
import { describe, expect, vi } from 'vitest';
import { screen } from '@testing-library/dom';
import { MemoryRouter } from 'react-router-dom';
import locales from '@/locales';

const spy = vi.spyOn(setting, 'useSettingStore');

describe('General.tsx', () => {
  beforeEach(() => {
    spy.mockReturnValue({
      updateDebug: vi.fn(),
      debug: false
    });
  });

  it('renders the General component', () => {
    render(
      <MemoryRouter>
        <General />
      </MemoryRouter>
    );

    expect(screen.queryByText(locales.general)).not.toBeNull();
    expect(screen.queryByText(locales.debug_mode)).not.toBeNull();
    expect(screen.queryByText(locales.enable_debug_console)).not.toBeNull();
  });

  it('toggles debug mode switch', () => {
    const { updateDebug } = useSettingStore();
    render(
      <MemoryRouter>
        <General />
      </MemoryRouter>
    );
    const switchElement = screen.getByRole('checkbox');
    fireEvent.click(switchElement);
    expect(updateDebug).toHaveBeenCalledWith(true);
  });

  it('displays the correct initial state of the switch', () => {
    spy.mockReturnValueOnce({
      updateDebug: vi.fn(),
      debug: true
    });
    render(
      <MemoryRouter>
        <General />
      </MemoryRouter>
    );

    expect(screen.queryByRole('checkbox', { checked: true })).not.toBeNull();
  });
});
