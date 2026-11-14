import { SettingGroup, SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import { requestNotificationPermission, sendTestNotification } from '@/core/notifications/announce';
import { tools } from '@/core/utils/tools';
import locales from '@/locales';
import { useSettingStore } from '@/store/settingStore/setting.store';
import type { NotificationSettings } from '@/store/settingStore/types';
import { invoke } from '@tauri-apps/api/core';
import { Box, Button, InputBase, Switch } from '@mui/material';
import { useEffect, useState, type JSX } from 'react';

const KINDS = ['query', 'import', 'export', 'backup'] as const;

export default function NotificationsPanel(): JSX.Element {
  const general = useSettingStore((state) => state.general);
  const updateGeneral = useSettingStore((state) => state.updateGeneral);
  const [desktop, setDesktop] = useState(false);
  const [autostart, setAutostart] = useState(false);
  const settings = general.notifications;

  useEffect(() => {
    void tools.isTauri().then(async (isDesktop) => {
      setDesktop(isDesktop);
      if (isDesktop) setAutostart(await invoke<boolean>('plugin:autostart|is_enabled').catch(() => false));
    });
  }, []);

  const set = (patch: Partial<NotificationSettings>): void =>
    updateGeneral({ notifications: { ...settings, ...patch } });

  return (
    <Box data-settings-id='notifications.panel'>
      <SettingGroup>
        <SettingRow
          id='notifications.enabled'
          label={locales.notification_settings_enabled}
          description={locales.notification_settings_enabled_hint}
          control={
            <Switch
              checked={settings.enabled}
              slotProps={{
                input: {
                  'aria-label': locales.notification_settings_enabled,
                  'data-testid': 'notifications-enabled'
                } as React.InputHTMLAttributes<HTMLInputElement>
              }}
              onChange={(event): void => {
                set({ enabled: event.target.checked });
                // The system asks once, on this click.
                if (event.target.checked) void requestNotificationPermission();
              }}
            />
          }
        />
        {KINDS.map((kind) => (
          <SettingRow
            key={kind}
            id={`notifications.${kind}`}
            label={locales[`notification_settings_${kind}`]}
            control={
              <Switch
                checked={settings[kind]}
                disabled={!settings.enabled}
                slotProps={{
                  input: {
                    'aria-label': locales[`notification_settings_${kind}`],
                    'data-testid': `notifications-${kind}`
                  } as React.InputHTMLAttributes<HTMLInputElement>
                }}
                onChange={(event): void => set({ [kind]: event.target.checked })}
              />
            }
          />
        ))}
        <SettingRow
          id='notifications.unfocused'
          label={locales.notification_settings_unfocused}
          description={locales.notification_settings_unfocused_hint}
          control={
            <Switch
              checked={settings.onlyWhenUnfocused}
              disabled={!settings.enabled}
              onChange={(event): void => set({ onlyWhenUnfocused: event.target.checked })}
            />
          }
        />
        <SettingRow
          id='notifications.sound'
          label={locales.notification_settings_sound}
          control={
            <Switch
              checked={settings.sound}
              disabled={!settings.enabled}
              slotProps={{
                input: {
                  'aria-label': locales.notification_settings_sound,
                  'data-testid': 'notifications-sound'
                } as React.InputHTMLAttributes<HTMLInputElement>
              }}
              onChange={(event): void => set({ sound: event.target.checked })}
            />
          }
        />
        <SettingRow
          id='notifications.test'
          label={locales.notification_settings_test}
          description={locales.notification_settings_test_hint}
          control={
            <Button variant='outlined' onClick={() => void sendTestNotification()} data-testid='notifications-test'>
              {locales.notification_settings_test_action}
            </Button>
          }
        />
        <SettingRow
          id='notifications.background'
          label={locales.notification_settings_background}
          description={locales.notification_settings_background_hint}
          control={
            <InputBase
              type='number'
              value={general.backgroundAfterSeconds}
              onChange={(event) =>
                updateGeneral({
                  backgroundAfterSeconds: Math.min(3600, Math.max(0, Math.floor(Number(event.target.value) || 0)))
                })
              }
              inputProps={{
                'aria-label': locales.notification_settings_background,
                'data-testid': 'notifications-background-seconds',
                min: 0,
                max: 3600
              }}
              sx={{ width: 90 }}
            />
          }
        />
        {desktop && (
          <SettingRow
            id='notifications.autostart'
            label={locales.notification_settings_autostart}
            description={locales.notification_settings_autostart_hint}
            control={
              <Switch
                checked={autostart}
                slotProps={{
                  input: {
                    'aria-label': locales.notification_settings_autostart,
                    'data-testid': 'notifications-autostart'
                  } as React.InputHTMLAttributes<HTMLInputElement>
                }}
                onChange={(event): void => {
                  setAutostart(event.target.checked);
                  void invoke(`plugin:autostart|${event.target.checked ? 'enable' : 'disable'}`).catch(() =>
                    setAutostart(!event.target.checked)
                  );
                }}
              />
            }
          />
        )}
        {desktop && (
          <SettingRow
            id='notifications.keep-running'
            label={locales.notification_settings_keep_running}
            description={locales.notification_settings_keep_running_hint}
            control={
              <Switch
                checked={general.keepRunningInBackground}
                slotProps={{
                  input: {
                    'aria-label': locales.notification_settings_keep_running,
                    'data-testid': 'notifications-keep-running'
                  } as React.InputHTMLAttributes<HTMLInputElement>
                }}
                onChange={(event): void => updateGeneral({ keepRunningInBackground: event.target.checked })}
              />
            }
          />
        )}
      </SettingGroup>
    </Box>
  );
}
