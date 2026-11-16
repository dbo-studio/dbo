import type { UserPermissions } from '@/api/auth/types';
import Modal from '@/components/base/Modal/Modal';
import locales from '@/locales';
import { Button } from '@mui/material';
import { type JSX, useState } from 'react';
import PermissionGroups, { grantedCount, usePermissionCatalog, withDefaults } from './PermissionGroups';

type Props = {
  value: UserPermissions;
  /** An admin has every permission and it cannot be changed. */
  isAdmin: boolean;
  disabled?: boolean;
  testIdPrefix: string;
  onSave: (next: UserPermissions) => void;
};

/** A user's permissions in the table: a count that opens the grouped list. */
export default function AdminUserPermissions({ value, isAdmin, disabled, testIdPrefix, onSave }: Props): JSX.Element {
  const catalog = usePermissionCatalog();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<UserPermissions>(value);

  const summary = isAdmin
    ? locales.admin_permissions_all
    : catalog
      ? locales.admin_permissions_summary
          .replace('{granted}', String(grantedCount(catalog, value)))
          .replace('{total}', String(catalog.length))
      : '…';

  const show = (): void => {
    setDraft(catalog ? withDefaults(catalog, value) : value);
    setOpen(true);
  };

  return (
    <>
      <Button
        disabled={disabled || isAdmin}
        aria-label={locales.admin_permissions_edit}
        data-testid={testIdPrefix}
        onClick={show}
      >
        {summary}
      </Button>
      <Modal
        open={open}
        title={locales.admin_permissions}
        size='md'
        onClose={(): void => setOpen(false)}
        footer={
          <>
            <Button onClick={(): void => setOpen(false)}>{locales.cancel}</Button>
            <Button
              variant='contained'
              data-testid={`${testIdPrefix}-save`}
              onClick={(): void => {
                onSave(draft);
                setOpen(false);
              }}
            >
              {locales.admin_permissions_save}
            </Button>
          </>
        }
      >
        <PermissionGroups value={draft} testIdPrefix={`${testIdPrefix}-perm`} onChange={setDraft} />
      </Modal>
    </>
  );
}
