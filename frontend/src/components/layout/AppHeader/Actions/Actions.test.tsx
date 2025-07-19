import { createZustandSelectorMock, renderWithProviders, resetAllMocks } from '@/test/utils/test-helpers.tsx';
import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Actions from './Actions.tsx';

const defaultSidebar = {
  leftWidth: 285,
  rightWidth: 285,
  showLeft: true,
  showRight: true
};

let mockUpdateSidebar: ReturnType<typeof vi.fn>;

function setupStore(sidebar = defaultSidebar, updateSidebar?: any): void {
  mockUpdateSidebar = updateSidebar ?? vi.fn();
  vi.mock('@/store/settingStore/setting.store', () => ({
    useSettingStore: createZustandSelectorMock({
      sidebar,
      updateSidebar: mockUpdateSidebar
    })
  }));
}

describe('Actions.tsx', () => {
  beforeEach(() => {
    resetAllMocks();
    vi.resetModules(); // برای اطمینان از پاک شدن mock قبلی
  });

  test('should render the Actions', () => {
    setupStore(defaultSidebar);
    renderWithProviders(<Actions />);
    expect(screen.getByLabelText('sideRight')).not.toBeNull();
    expect(screen.getByLabelText('sideLeft')).not.toBeNull();
  });

  test('should update close right sidebar', async () => {
    setupStore(defaultSidebar, vi.fn());
    renderWithProviders(<Actions />);
    await userEvent.click(screen.getByLabelText('sideRight'));
    expect(mockUpdateSidebar).toHaveBeenCalledWith({ showRight: false });
  });

  test('should update open right sidebar', async () => {
    setupStore({ ...defaultSidebar, showRight: false }, vi.fn());
    renderWithProviders(<Actions />);
    await userEvent.click(screen.getByLabelText('sideRight'));
    expect(mockUpdateSidebar).toHaveBeenCalledWith({ showRight: true, rightWidth: 285 });
  });

  test('should update close left sidebar', async () => {
    setupStore(defaultSidebar, vi.fn());
    renderWithProviders(<Actions />);
    await userEvent.click(screen.getByLabelText('sideLeft'));
    expect(mockUpdateSidebar).toHaveBeenCalledWith({ showLeft: false });
  });

  test('should update open left sidebar', async () => {
    setupStore({ ...defaultSidebar, showLeft: false, showRight: false }, vi.fn());
    renderWithProviders(<Actions />);
    await userEvent.click(screen.getByLabelText('sideLeft'));
    expect(mockUpdateSidebar).toHaveBeenCalledWith({ showLeft: true, leftWidth: 285 });
  });
});
