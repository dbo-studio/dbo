import AccountModal from '@/components/common/Account/AccountModal';
import { SettingRow } from '@/components/common/Settings/SettingRow/SettingRow';
import locales from '@/locales';
import { useAccountStore } from '@/store/accountStore/account.store';
import { Button } from '@mui/material';
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
            <Button variant='outlined' onClick={signOut} data-testid='account-sign-out'>
              {locales.account_sign_out}
            </Button>
          ) : (
            <Button variant='contained' onClick={(): void => setOpen(true)} data-testid='account-sign-in'>
              {locales.account_sign_in}
            </Button>
          )
        }
      />
      <AccountModal open={open} onClose={(): void => setOpen(false)} />
    </>
  );
}
