import FieldInput from '@/components/base/FieldInput/FieldInput';
import locales from '@/locales';
import { type JSX, useState } from 'react';

type Props = {
  /** Gets the pasted string when DBO recognises its scheme. */
  onUri: (uri: string) => void;
  recognises: (uri: string) => boolean;
};

/** Paste a connection string and the engine and every field follow. */
export default function ConnectionUriBar({ onUri, recognises }: Props): JSX.Element {
  const [value, setValue] = useState('');
  const [unknown, setUnknown] = useState(false);

  const apply = (raw: string): void => {
    const uri = raw.trim();
    if (!uri) {
      setUnknown(false);
      return;
    }
    if (recognises(uri)) {
      onUri(uri);
      setValue('');
      setUnknown(false);
    } else {
      setUnknown(/^[a-z][a-z0-9+.-]*:\/\//i.test(uri));
    }
  };

  return (
    <FieldInput
      margin='none'
      name='connection-uri-quickstart'
      label={locales.connection_paste_uri}
      placeholder={locales.connection_paste_uri_placeholder}
      value={value}
      error={unknown}
      helpertext={unknown ? locales.connection_uri_unknown : undefined}
      onChange={(e): void => {
        setValue(e.target.value);
        apply(e.target.value);
      }}
      onBlur={(e): void => apply(e.target.value)}
    />
  );
}
