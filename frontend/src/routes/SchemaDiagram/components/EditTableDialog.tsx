import { useObjectForm } from '@/routes/ObjectForm/hooks/useObjectForm';
import ObjectTabs from '@/routes/ObjectForm/ObjectTabs/ObjectTabs';
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
import { useMemo } from 'react';

export interface EditTableDialogProps {
  open: boolean;
  onClose: () => void;
  nodeId: string;
  tableName: string;
  onSuccess?: () => void;
}

export default function EditTableDialog({ open, onClose, nodeId, tableName, onSuccess }: EditTableDialogProps) {
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
    action: 'edit',
    enabled: open,
    onSuccess: () => {
      onSuccess?.();
      onClose();
    }
  });

  const handleSave = async () => {
    await save();
  };

  const handleCancel = () => {
    cancel();
    onClose();
  };

  const hasChanges = useMemo(() => {
    // Check if there are any changes in formData compared to original field values
    if (!fields.length || !formData) return false;

    return fields.some((field) => {
      const currentValue = formData[field.id];
      const originalValue = field.originalValue ?? field.value;

      if (field.type === 'array') {
        const currentArray = currentValue || [];
        const originalArray = originalValue || [];
        return JSON.stringify(currentArray) !== JSON.stringify(originalArray);
      }

      return currentValue !== originalValue;
    });
  }, [fields, formData]);

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth='md' fullWidth>
      <DialogTitle>
        <Box display='flex' alignItems='center' justifyContent='space-between'>
          <Typography variant='h6'>Edit Table: {tableName}</Typography>
          {isLoading && <CircularProgress size={20} />}
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Box display='flex' flexDirection='column' height='60vh'>
          {tabs.length > 0 && (
            <ObjectTabs
              tabs={tabs}
              selectedTabIndex={selectedTabId || tabs[0]?.id}
              setSelectedTabIndex={setSelectedTabId}
            />
          )}
          <Box flex={1} overflow='auto' mt={2}>
            {fields.length > 0 ? (
              <TableForm
                formSchema={fields}
                formData={formData}
                onFieldChange={updateField}
                onArrayFieldChange={updateArrayField}
                onAddArrayItem={addArrayItem}
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
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
