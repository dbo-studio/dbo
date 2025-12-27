import FieldInput from '@/components/base/FieldInput/FieldInput';
import { EventFor } from '@/types';
import { JSX, useState } from 'react';
import { useCellEditing } from '../../DataGrid/hooks/useCellEditing';
import { DBFieldItemProps } from '../types';

export function DBFieldItem({ row, column }: DBFieldItemProps): JSX.Element {
  const [value, setValue] = useState<string | number>(
    row[column.name] == null || row[column.name] === undefined ? '' : (row[column.name] as string | number)
  );

  const { handleRowChange } = useCellEditing(row, column.name, String(row[column.name]));

  const handleChange = (e: EventFor<'input', 'onChange'>): void => {
    setValue(e.target.value as string | number);
  };

  const handleBlur = (e: EventFor<'input', 'onBlur'>): void => {
    setValue(e.target.value as string | number);
    handleRowChange(e);
  };

  return (
    <FieldInput
      size='small'
      value={String(value)}
      fullWidth={true}
      label={column.name}
      typelabel={column.type}
      type={column.type}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
