import api from '@/src/api';
import useAPI from '@/src/hooks/useApi.hook';
import locales from '@/src/locales';
import {useConnectionStore} from '@/src/store/connectionStore/connection.store';
import {EventFor} from '@/src/types';
import {v4 as uuid} from 'uuid';
import SelectInput from '../../../base/SelectInput/SelectInput';
import SelectOption from '../../../base/SelectInput/SelectOption';
import {SchemasStyled} from "@/components/common/DBTreeView/Schemas/Schemas.styled";

export default function Schemas() {
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
    <SchemasStyled>
      {currentConnection && currentConnection.schemas && (
        <SelectInput
          disabled={currentConnection.schemas.length == 0}
          size='medium'
          fullWidth={true}
          onChange={handleChangeSchema}
          defaultValue={currentConnection.currentSchema}
        >
          {currentConnection.schemas.map((s: string) => (
            <SelectOption key={uuid()} value={s}>
              {s}
            </SelectOption>
          ))}
          {currentConnection.schemas.length == 0 && (
            <SelectOption value={'null'}>{locales.no_active_schema_find}</SelectOption>
          )}
        </SelectInput>
      )}
    </SchemasStyled>
  );
}
