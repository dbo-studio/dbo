import Modal from '@/components/base/Modal/Modal';
import AccountStep from '@/components/common/Account/AccountStep/AccountStep';
import { SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import locales from '@/locales';
import { useAccountStore } from '@/store/accountStore/account.store';
import { Box, Button } from '@mui/material';
import { type JSX, useState } from 'react';

/** The DBO account in one row: who is signed in and a sign-out, or a sign-in. */
export function AccountSettings(): JSX.Element {
  const user = useAccountStore((state) => state.user);
  const signedIn = useAccountStore((state) => Boolean(state.token));
  const signOut = useAccountStore((state) => state.signOut);
  const [open, setOpen] = useState(false);

  return (
    <>
      <SettingRow
        id='general.account'
        label={locales.account_row_title}
        description={
          signedIn
            ? locales.account_row_signed_in.replace('{email}', user?.email ?? '')
            : locales.account_row_signed_out
        }
        control={
          signedIn ? (
            <Button size='small' variant='outlined' onClick={signOut} data-testid='account-sign-out'>
              {locales.account_sign_out}
            </Button>
          ) : (
            <Button size='small' variant='contained' onClick={(): void => setOpen(true)} data-testid='account-sign-in'>
              {locales.account_sign_in}
            </Button>
          )
        }
      />
      <Modal open={open} title={locales.account_row_title} onClose={(): void => setOpen(false)}>
        <Box sx={{ width: 'min(400px, calc(100vw - 96px))', pt: 1 }}>
          <AccountStep onDone={(): void => setOpen(false)} />
        </Box>
      </Modal>
    </>
  );
}
