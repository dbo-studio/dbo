import type { ConnectionSSHOptionsType } from '@/api/connection/types';
import * as v from 'valibot';

export const SSH_AUTH_METHODS = [
  { value: 'password', labelKey: 'ssh_auth_password' as const },
  { value: 'key', labelKey: 'ssh_auth_key' as const },
  { value: 'agent', labelKey: 'ssh_auth_agent' as const }
] as const;

export type SSHHopFormValues = {
  host: string;
  port: string;
  username: string;
  authMethod: string;
  password: string;
  privateKey: string;
  passphrase: string;
  /** Stored on the server (never returned); blank input keeps it. */
  passwordSet: boolean;
  privateKeySet: boolean;
  passphraseSet: boolean;
};

export type SSHFormValues = SSHHopFormValues & {
  enabled: boolean;
  jumpEnabled: boolean;
  jump: SSHHopFormValues;
};

const hopSchema = v.object({
  host: v.string(),
  port: v.string(),
  username: v.string(),
  authMethod: v.string(),
  password: v.string(),
  privateKey: v.string(),
  passphrase: v.string(),
  passwordSet: v.boolean(),
  privateKeySet: v.boolean(),
  passphraseSet: v.boolean()
});

export const sshFormSchema = v.object({
  ...hopSchema.entries,
  enabled: v.boolean(),
  jumpEnabled: v.boolean(),
  jump: hopSchema
});

const emptyHop = (): SSHHopFormValues => ({
  host: '',
  port: '22',
  username: '',
  authMethod: 'password',
  password: '',
  privateKey: '',
  passphrase: '',
  passwordSet: false,
  privateKeySet: false,
  passphraseSet: false
});

const hopFromOptions = (ssh?: ConnectionSSHOptionsType | null): SSHHopFormValues => ({
  host: ssh?.host ?? '',
  port: ssh?.port ? String(ssh.port) : '22',
  username: ssh?.username ?? '',
  authMethod: ssh?.authMethod || 'password',
  // Secrets are never returned by the API; blank means "keep stored value".
  password: '',
  privateKey: '',
  passphrase: '',
  passwordSet: Boolean(ssh?.passwordSet),
  privateKeySet: Boolean(ssh?.privateKeySet),
  passphraseSet: Boolean(ssh?.passphraseSet)
});

export function sshFormDefaults(ssh?: ConnectionSSHOptionsType | null): SSHFormValues {
  return {
    ...hopFromOptions(ssh),
    enabled: Boolean(ssh?.enabled),
    jumpEnabled: Boolean(ssh?.jump?.enabled),
    jump: ssh?.jump ? hopFromOptions(ssh.jump) : emptyHop()
  };
}

const hopToOptions = (hop: SSHHopFormValues): ConnectionSSHOptionsType => ({
  enabled: true,
  host: hop.host.trim(),
  port: Number(hop.port || 22),
  username: hop.username.trim(),
  authMethod: hop.authMethod,
  ...(hop.authMethod === 'password' && hop.password ? { password: hop.password } : {}),
  ...(hop.authMethod === 'key' && hop.privateKey ? { privateKey: hop.privateKey } : {}),
  ...(hop.authMethod === 'key' && hop.passphrase ? { passphrase: hop.passphrase } : {})
});

export function sshOptionsFromForm(values: SSHFormValues): ConnectionSSHOptionsType | undefined {
  if (!values.enabled) {
    // Explicitly disable so an update clears a previously enabled tunnel.
    return { enabled: false };
  }

  return {
    ...hopToOptions(values),
    ...(values.jumpEnabled ? { jump: hopToOptions(values.jump) } : {})
  };
}
