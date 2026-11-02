import type { ChannelType, ConnectorKind, DestinationType } from '@/api/backup/types';
import type { IconTypes } from '@/components/base/CustomIcon/types';
import locales from '@/locales';

export type FieldSpec = {
  key: string;
  label: string;
  /** Stored encrypted and never shown again. */
  secret?: boolean;
  input?: 'text' | 'number' | 'bool' | 'select' | 'textarea';
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
};

export type ConnectorTypeSpec = {
  type: DestinationType | ChannelType;
  kind: ConnectorKind;
  label: string;
  description: string;
  icon: keyof typeof IconTypes;
  fields: FieldSpec[];
};

const includeError: FieldSpec = { key: 'includeError', label: locales.connector_include_error, input: 'bool' };

export const CONNECTOR_TYPES: ConnectorTypeSpec[] = [
  {
    type: 'folder',
    kind: 'destination',
    label: locales.connector_folder,
    description: locales.connector_folder_hint,
    icon: 'folder',
    fields: [{ key: 'path', label: locales.connector_path, placeholder: '/mnt/nas/backups', required: true }]
  },
  {
    type: 's3',
    kind: 'destination',
    label: locales.connector_s3,
    description: locales.connector_s3_hint,
    icon: 'cloud',
    fields: [
      { key: 'endpoint', label: locales.connector_endpoint, placeholder: 's3.amazonaws.com' },
      { key: 'region', label: locales.connector_region, placeholder: 'us-east-1' },
      { key: 'bucket', label: locales.connector_bucket, required: true },
      { key: 'prefix', label: locales.connector_prefix, placeholder: 'dbo/' },
      { key: 'insecure', label: locales.connector_insecure, input: 'bool' },
      { key: 'lockDays', label: locales.connector_lock_days, input: 'number', placeholder: '0' },
      {
        key: 'lockMode',
        label: locales.connector_lock_mode,
        input: 'select',
        options: [
          { label: locales.connector_lock_governance, value: 'governance' },
          { label: locales.connector_lock_compliance, value: 'compliance' }
        ]
      },
      { key: 'accessKey', label: locales.connector_access_key, secret: true, required: true },
      { key: 'secretKey', label: locales.connector_secret_key, secret: true, required: true }
    ]
  },
  {
    type: 'webdav',
    kind: 'destination',
    label: locales.connector_webdav,
    description: locales.connector_webdav_hint,
    icon: 'cloud',
    fields: [
      { key: 'url', label: locales.connector_url, placeholder: 'https://cloud.example.com/remote.php/dav/files/me', required: true },
      { key: 'username', label: locales.connector_username },
      { key: 'password', label: locales.connector_password, secret: true },
      { key: 'path', label: locales.connector_remote_path, placeholder: 'backups' }
    ]
  },
  {
    type: 'sftp',
    kind: 'destination',
    label: locales.connector_sftp,
    description: locales.connector_sftp_hint,
    icon: 'hardDrive',
    fields: [
      { key: 'host', label: locales.connector_host, required: true },
      { key: 'port', label: locales.connector_port, input: 'number', placeholder: '22' },
      { key: 'username', label: locales.connector_username, required: true },
      { key: 'path', label: locales.connector_remote_path, placeholder: '/backups' },
      { key: 'password', label: locales.connector_password, secret: true },
      { key: 'privateKey', label: locales.connector_private_key, secret: true, input: 'textarea' }
    ]
  },
  {
    type: 'ftp',
    kind: 'destination',
    label: locales.connector_ftp,
    description: locales.connector_ftp_hint,
    icon: 'hardDrive',
    fields: [
      { key: 'host', label: locales.connector_host, required: true },
      { key: 'port', label: locales.connector_port, input: 'number', placeholder: '21' },
      { key: 'username', label: locales.connector_username, required: true },
      { key: 'password', label: locales.connector_password, secret: true },
      { key: 'path', label: locales.connector_remote_path, placeholder: '/backups' },
      {
        key: 'security',
        label: locales.connector_security,
        input: 'select',
        options: [
          { label: locales.connector_security_none, value: 'none' },
          { label: locales.connector_security_explicit, value: 'explicit' }
        ]
      }
    ]
  },
  {
    type: 'gdrive',
    kind: 'destination',
    label: locales.connector_gdrive,
    description: locales.connector_gdrive_hint,
    icon: 'cloud',
    fields: [
      { key: 'clientId', label: locales.connector_client_id, secret: true, required: true },
      { key: 'clientSecret', label: locales.connector_client_secret, secret: true, required: true },
      { key: 'folderId', label: locales.connector_folder_id }
    ]
  },
  {
    type: 'email',
    kind: 'channel',
    label: locales.connector_email,
    description: locales.connector_email_hint,
    icon: 'mail',
    fields: [
      {
        key: 'recipients',
        label: locales.connector_recipients,
        placeholder: 'ops@example.com, dba@example.com',
        required: true
      },
      includeError
    ]
  },
  {
    type: 'slack',
    kind: 'channel',
    label: locales.connector_slack,
    description: locales.connector_slack_hint,
    icon: 'message',
    fields: [{ key: 'webhookUrl', label: locales.connector_webhook_url, secret: true, required: true }, includeError]
  },
  {
    type: 'discord',
    kind: 'channel',
    label: locales.connector_discord,
    description: locales.connector_discord_hint,
    icon: 'message',
    fields: [{ key: 'webhookUrl', label: locales.connector_webhook_url, secret: true, required: true }, includeError]
  },
  {
    type: 'telegram',
    kind: 'channel',
    label: locales.connector_telegram,
    description: locales.connector_telegram_hint,
    icon: 'send',
    fields: [
      { key: 'botToken', label: locales.connector_bot_token, secret: true, required: true },
      { key: 'chatId', label: locales.connector_chat_id, required: true },
      includeError
    ]
  },
  {
    type: 'webhook',
    kind: 'channel',
    label: locales.connector_webhook,
    description: locales.connector_webhook_hint,
    icon: 'webhook',
    fields: [
      { key: 'url', label: locales.connector_url, required: true, placeholder: 'https://example.com/hooks/dbo' },
      { key: 'signingSecret', label: locales.connector_signing_secret, secret: true },
      includeError
    ]
  }
];

export const specOf = (type: string): ConnectorTypeSpec | undefined => CONNECTOR_TYPES.find((t) => t.type === type);
