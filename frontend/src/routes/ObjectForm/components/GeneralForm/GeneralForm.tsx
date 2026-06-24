import locales from '@/locales';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useFormObjectStore } from '@/store/formObject/formObject.store';
import { ObjectTabType } from '@/types';
import { Box, Typography } from '@mui/material';
import React, { memo } from 'react';
import SimpleField from '../SimpleForm/SimpleField';
import { GeneralFormFieldsStackStyled, GeneralFormStyled } from './GeneralForm.styled';

function SimpleForm({ objectTabId }: { objectTabId: string }): React.JSX.Element {
  const selectedTab = useSelectedTab<ObjectTabType>();
  const general = useFormObjectStore((state) => state.getFormData(objectTabId)?.general);
  const updateGeneralField = useFormObjectStore((state) => state.updateGeneralField);

  if (general?.length === 0) return <></>;

  return (
    <GeneralFormStyled>
      <Typography variant='body1'>{locales.general_info}</Typography>
      <GeneralFormFieldsStackStyled direction={'row'}>
        {general?.map((field) => (
          <Box key={field.id} sx={{ gridColumn: field.type === 'query' ? '1 / -1' : 'auto' }} data-testid={`object-form-field-${field.id}`}>
            <SimpleField
              isArrayForm={false}
              field={field}
              onChange={(value): void => updateGeneralField(selectedTab?.id ?? '', field.id, value)}
              dynamicOptions={undefined}
              isLoadingDynamic={false}
            />
          </Box>
        ))}
      </GeneralFormFieldsStackStyled>
    </GeneralFormStyled>
  );
}

export default memo(SimpleForm);
