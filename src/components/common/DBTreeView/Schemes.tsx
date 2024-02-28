import api from '@/src/api';
import useAPI from '@/src/hooks/useApi.hook';
import { useConnectionStore } from '@/src/store/connectionStore/connection.store';
import { EventFor } from '@/src/types';
import { Box } from '@mui/material';
import { v4 as uuid } from 'uuid';
import SelectInput from '../../base/SelectInput/SelectInput';
import SelectOption from '../../base/SelectInput/SelectOption';
import { SchemaStyled } from './DBTreeView.styled';

export default function Schemes() {
  const { currentConnection, updateCurrentConnection } = useConnectionStore();

  const { request: updateConnection } = useAPI({
    apiMethod: api.connection.updateConnection
  });

  const handleChangeSchema = (e: EventFor<'select', 'onChange'>) => {
    const schema = currentConnection?.schemas?.filter((s: string) => s == e.target.value);
    if (!currentConnection || !schema || schema?.length == 0) {
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
    <SchemaStyled>
      <Box>
        {currentConnection && currentConnection.schemas && (
          <SelectInput
            size='medium'
            fullWidth={true}
            onChange={handleChangeSchema}
            defaultValue={currentConnection.schemas[0]}
          >
            {currentConnection.schemas.map((s: string) => (
              <SelectOption key={uuid()} value={s}>
                {s}
              </SelectOption>
            ))}
          </SelectInput>
        )}
      </Box>
    </SchemaStyled>
  );
}
