import { useObjectForm } from '@/routes/ObjectForm/hooks/useObjectForm';
import TableForm from '@/routes/ObjectForm/TableForm/TableForm';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  CircularProgress,
  Typography
} from '@mui/material';
import { useMemo, useEffect } from 'react';

export interface AddColumnDialogProps {
  open: boolean;
  onClose: () => void;
  nodeId: string;
  tableName: string;
  onSuccess?: () => void;
}

export default function AddColumnDialog({
  open,
  onClose,
  nodeId,
  tableName,
  onSuccess
}: AddColumnDialogProps) {
  const {
    tabs,
    selectedTabId,
    fields,
    formData,
    isLoading,
    isSaving,
    setSelectedTabId,
    updateField,
    updateArrayField,
    addArrayItem,
    save,
    cancel
  } = useObjectForm({
    nodeId,
    action: 'editTable',
    enabled: open,
    onSuccess: () => {
      onSuccess?.();
      onClose();
    }
  });

  // Find TableColumnsTab
  const columnsTab = useMemo(() => {
    return tabs.find((tab) => tab.id === 'table_columns');
  }, [tabs]);

  // Find the columns array field
  const arrayField = useMemo(() => {
    if (!fields.length || !columnsTab) return null;
    return fields.find((f) => f.type === 'array');
  }, [fields, columnsTab]);

  // Auto-select columns tab when dialog opens
  useEffect(() => {
    if (open && columnsTab && !selectedTabId) {
      setSelectedTabId(columnsTab.id);
    }
  }, [open, columnsTab, selectedTabId, setSelectedTabId]);

  // Auto-add a new column when dialog opens
  useEffect(() => {
    if (open && arrayField && !isLoading) {
      // Wait a bit for form data to initialize
      setTimeout(() => {
        addArrayItem(arrayField.id);
      }, 100);
    }
  }, [open, arrayField, isLoading, addArrayItem]);

  const handleSave = async () => {
    await save();
  };

  const handleCancel = () => {
    cancel();
    onClose();
  };

  const hasChanges = useMemo(() => {
    if (!arrayField) return false;
    const currentColumns = formData[arrayField.id] || arrayField.value || [];
    // Check if there's a new column with at least a name
    return currentColumns.some((col: any) => {
      if (col.added) {
        const templateFields = arrayField.fields?.[0]?.fields || [];
        const nameField = templateFields.find((f: any) => f.id === 'column_name');
        return col[nameField?.id || 'column_name'];
      }
      return false;
    });
  }, [arrayField, formData]);

  if (!arrayField) {
    return (
      <Dialog open={open} onClose={handleCancel} maxWidth='md' fullWidth>
        <DialogTitle>Add Column to {tableName}</DialogTitle>
        <DialogContent>
          <Box p={4} display='flex' justifyContent='center'>
            {isLoading ? <CircularProgress /> : <Typography>Loading...</Typography>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const templateFields = arrayField.fields?.[0]?.fields || [];
  const currentColumns = formData[arrayField.id] || arrayField.value || [];
  const newColumn = currentColumns.find((col: any) => col.added);

  // Create form fields for the new column
  const columnFields = templateFields.map((field: any) => ({
    ...field,
    value: newColumn?.[field.id] ?? (field.type === 'checkbox' ? false : ''),
    originalValue: undefined
  }));

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth='md' fullWidth>
      <DialogTitle>
        <Box display='flex' alignItems='center' justifyContent='space-between'>
          <Typography variant='h6'>Add Column to {tableName}</Typography>
          {isLoading && <CircularProgress size={20} />}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box display='flex' flexDirection='column' height='50vh'>
          <Box flex={1} overflow='auto' mt={2}>
            {columnFields.length > 0 ? (
              <TableForm
                formSchema={columnFields}
                formData={newColumn || {}}
                onFieldChange={(fieldId, value) => {
                  // Update the new column in the array
                  const updatedColumns = [...currentColumns];
                  const newColumnIndex = updatedColumns.findIndex((col: any) => col.added);
                  if (newColumnIndex !== -1) {
                    updatedColumns[newColumnIndex] = {
                      ...updatedColumns[newColumnIndex],
                      [fieldId]: value
                    };
                  } else {
                    // Create new column if not found
                    const newCol: any = { added: true };
                    templateFields.forEach((f: any) => {
                      newCol[f.id] = f.type === 'checkbox' ? false : '';
                    });
                    newCol[fieldId] = value;
                    updatedColumns.push(newCol);
                  }
                  updateArrayField(arrayField.id, updatedColumns);
                }}
                showStatusBar={false}
                isSaving={isSaving}
              />
            ) : isLoading ? (
              <Box display='flex' justifyContent='center' p={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Box p={4}>
                <Typography color='text.secondary'>No fields available</Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant='contained'
          disabled={isSaving || !hasChanges}
          startIcon={isSaving ? <CircularProgress size={16} /> : null}
        >
          Add Column
        </Button>
      </DialogActions>
    </Dialog>
  );
}

