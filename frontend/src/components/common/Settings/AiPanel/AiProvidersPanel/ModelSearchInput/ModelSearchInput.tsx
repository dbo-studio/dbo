import { PASSWORD_MANAGER_OFF } from '@/components/base/FieldInput/FieldInput';
import type { SelectInputOption } from '@/components/base/SelectInput/types';
import type { JSX } from 'react';
import { components, type InputProps } from 'react-select';

export function createModelSearchInput(testId: string) {
  return function ModelSearchInput(props: InputProps<SelectInputOption, false>): JSX.Element {
    return <components.Input {...props} autoComplete='off' data-testid={testId} {...PASSWORD_MANAGER_OFF} />;
  };
}