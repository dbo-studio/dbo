import locales from '@/locales';
import { tools } from '@/core/utils/tools';
import { useSettingStore } from '@/store/settingStore/setting.store';

const DOMAIN = 'com.dbostudio.dev';
const NAME = 'safe-mode-password';

// Unsigned `tauri dev` binaries cannot write the data-protection keychain.
// Keep the verified password in-process so Touch ID still works until quit.
let sessionPassword: string | null = null;

async function loadPlugin(): Promise<typeof import('@choochmeque/tauri-plugin-biometry-api') | null> {
  if (!(await tools.isTauri())) {
    return null;
  }

  try {
    return await import('@choochmeque/tauri-plugin-biometry-api');
  } catch {
    return null;
  }
}

function pluginErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }
  return locales.safe_mode_biometrics_failed;
}

export async function deviceBiometricsAvailable(): Promise<boolean> {
  const plugin = await loadPlugin();
  if (!plugin) {
    return false;
  }

  try {
    const status = await plugin.checkStatus();
    return status.isAvailable;
  } catch {
    return false;
  }
}

export async function persistSafeModePassword(password: string, options?: { promptIfNeeded?: boolean }): Promise<void> {
  const plugin = await loadPlugin();
  if (!plugin) {
    throw new Error(locales.safe_mode_biometrics_failed);
  }

  const status = await plugin.checkStatus();
  if (!status.isAvailable) {
    throw new Error(status.error ?? locales.safe_mode_biometrics_failed);
  }

  try {
    await plugin.setData({ domain: DOMAIN, name: NAME, data: password });
    sessionPassword = password;
    return;
  } catch {
    if (options?.promptIfNeeded) {
      try {
        await plugin.authenticate(locales.safe_mode_password_desc, {
          allowDeviceCredential: true
        });
      } catch (authError) {
        throw new Error(pluginErrorMessage(authError), { cause: authError });
      }
    }
    sessionPassword = password;
  }
}

export async function storeSafeModePassword(password: string): Promise<void> {
  if (!useSettingStore.getState().general.enableSafeModeBiometrics) {
    return;
  }

  await persistSafeModePassword(password).catch(() => {
    sessionPassword = password;
  });
}

export async function removeSafeModePassword(): Promise<void> {
  sessionPassword = null;
  const plugin = await loadPlugin();
  if (!plugin) {
    return;
  }

  try {
    await plugin.removeData({ domain: DOMAIN, name: NAME });
  } catch {
    // Missing items and unsigned builds are not an error for the caller.
  }
}

export async function safeModeBiometricsAvailable(): Promise<boolean> {
  if (sessionPassword) {
    return true;
  }

  const plugin = await loadPlugin();
  if (!plugin) {
    return false;
  }

  try {
    const status = await plugin.checkStatus();
    if (!status.isAvailable) {
      return false;
    }

    return await plugin.hasData({ domain: DOMAIN, name: NAME });
  } catch {
    return false;
  }
}

export async function loadSafeModePassword(): Promise<string | null> {
  const plugin = await loadPlugin();
  if (!plugin) {
    return null;
  }

  try {
    const response = await plugin.getData({
      domain: DOMAIN,
      name: NAME,
      reason: locales.safe_mode_password_desc
    });
    return response.data || null;
  } catch {
    if (!sessionPassword) {
      return null;
    }

    await plugin.authenticate(locales.safe_mode_password_desc, {
      allowDeviceCredential: true
    });
    return sessionPassword;
  }
}

export async function unlockWithBiometrics(): Promise<string | null> {
  try {
    if (!(await safeModeBiometricsAvailable())) {
      return null;
    }

    return await loadSafeModePassword();
  } catch {
    return null;
  }
}
