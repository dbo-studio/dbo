import locales from '@/locales';
import { useSelectedTab } from '@/hooks/useSelectedTab.hook';
import { useFormObjectStore } from '@/store/formObject/formObject.store';
import { ObjectTabType } from '@/types';
import { FormFieldType } from '@/types/Tree';
import { Typography } from '@mui/material';
import React, { memo } from 'react';
import SimpleField from '../SimpleForm/SimpleField';
import { GeneralFormFieldStyled, GeneralFormFieldsGridStyled, GeneralFormStyled } from './GeneralForm.styled';

const isFullWidthGeneralField = (field: FormFieldType): boolean => field.type === 'query';

function SimpleForm({ objectTabId }: { objectTabId: string }): React.JSX.Element {
  const selectedTab = useSelectedTab<ObjectTabType>();
  const general = useFormObjectStore((state) => state.getFormData(objectTabId)?.general);
  const updateGeneralField = useFormObjectStore((state) => state.updateGeneralField);

  if (general?.length === 0) return <></>;

  return (
    <GeneralFormStyled>
      <Typography variant='subtitle2' color='text.secondary'>
        {locales.general_info}
      </Typography>
      <GeneralFormFieldsGridStyled>
        {general?.map((field) => (
          <GeneralFormFieldStyled
            key={field.id}
            fullWidth={isFullWidthGeneralField(field)}
            data-testid={`object-form-field-${field.id}`}
          >
            <SimpleField
              isArrayForm={false}
              field={field}
              onChange={(value): void => updateGeneralField(selectedTab?.id ?? '', field.id, value)}
              dynamicOptions={undefined}
              isLoadingDynamic={false}
            />
          </GeneralFormFieldStyled>
        ))}
      </GeneralFormFieldsGridStyled>
    </GeneralFormStyled>
  );
}

export default memo(SimpleForm);
