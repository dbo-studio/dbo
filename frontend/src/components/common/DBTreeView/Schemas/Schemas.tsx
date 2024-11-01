import api from '@/api';
import SelectInput from '@/components/base/SelectInput/SelectInput.tsx';
import { SchemasStyled } from '@/components/common/DBTreeView/Schemas/Schemas.styled';
import useAPI from '@/hooks/useApi.hook';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';
import { MenuItem } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select/SelectInput';
import { v4 as uuid } from 'uuid';
import SelectOption from '../../../base/SelectInput/SelectOption';

export default function Schemas() {
  const { currentConnection } = useConnectionStore();
  const { updateCurrentConnection } = useConnectionStore();

  const { request: updateConnection } = useAPI({
    apiMethod: api.connection.updateConnection
  });

  const handleChangeSchema = (e: SelectChangeEvent<unknown>) => {
    console.log(e.target.value);
    const schema = currentConnection?.schemas?.filter((s: string) => s === e.target.value);
    if (!currentConnection || !schema || schema?.length === 0) {
      return;
    }

    currentConnection.currentSchema = schema[0];
    updateConnection({
      id: currentConnection.id,
      current_schema: schema[0]
    }).then((res) => {
      updateCurrentConnection(res);
    });
  };

  return (
    <SchemasStyled>
      {currentConnection?.schemas && (
        <SelectInput
          disabled={currentConnection.schemas.length === 0}
          size='medium'
          fullWidth={true}
          onChange={handleChangeSchema}
          value={currentConnection.currentSchema}
        >
          {currentConnection.schemas.map((s: string) => (
            <MenuItem key={uuid()} selected={s === currentConnection.currentSchema} value={s}>
              {s}
            </MenuItem>
          ))}
          {currentConnection.schemas.length === 0 && (
            <SelectOption value={'null'}>{locales.no_active_schema_find}</SelectOption>
          )}
        </SelectInput>
      )}
    </SchemasStyled>
  );
}
