import api from '@/api';
import SelectInput from '@/components/base/SelectInput/SelectInput.tsx';
import type { SelectInputOption } from '@/components/base/SelectInput/types.ts';
import { SchemasStyled } from '@/components/common/DBTreeView/Schemas/Schemas.styled';
import useAPI from '@/hooks/useApi.hook';
import locales from '@/locales';
import { useConnectionStore } from '@/store/connectionStore/connection.store';

export default function Schemas() {
  const currentConnection = useConnectionStore((state) => state.currentConnection);
  const { updateCurrentConnection } = useConnectionStore();

  const { request: updateConnection } = useAPI({
    apiMethod: api.connection.updateConnection
  });

  const handleChangeSchema = (value: SelectInputOption) => {
    const schema = currentConnection?.schemas?.filter((s: string) => s === value.value);
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
          emptylabel={locales.no_active_schema_find}
          value={currentConnection.currentSchema}
          disabled={currentConnection.schemas.length === 0}
          size='medium'
          options={currentConnection.schemas.map((s) => ({ value: s, label: s }))}
          onChange={handleChangeSchema}
        />
      )}
    </SchemasStyled>
  );
}
