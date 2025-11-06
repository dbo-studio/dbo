import { useObjectForm } from '@/routes/ObjectForm/hooks/useObjectForm';
import TableForm from '@/routes/ObjectForm/TableForm/TableForm';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography
} from '@mui/material';
import { useEffect, useMemo } from 'react';

export interface EditColumnDialogProps {
    open: boolean;
    onClose: () => void;
    nodeId: string;
    columnName: string;
    onSuccess?: () => void;
}

export default function EditColumnDialog({
    open,
    onClose,
    nodeId,
    columnName,
    onSuccess
}: EditColumnDialogProps) {
    const {
        tabs,
        selectedTabId,
        fields,
        formData,
        isLoading,
        isSaving,
        setSelectedTabId,
        updateArrayField,
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

    // Find TableColumnsTab and set it as selected
    const columnsTab = useMemo(() => {
        return tabs.find((tab) => tab.id === 'table_columns');
    }, [tabs]);

    // Find the column in the array
    const columnField = useMemo(() => {
        if (!fields.length || !columnsTab) return null;
        // TableColumnsTab returns an array field
        const arrayField = fields.find((f) => f.type === 'array');
        if (!arrayField || !arrayField.value) return null;

        const columns = arrayField.value as any[];
        const columnIndex = columns.findIndex(
            (col: any) => col.column_name === columnName || col.name === columnName
        );
        if (columnIndex === -1) return null;

        return { arrayField, columnIndex, column: columns[columnIndex] };
    }, [fields, columnName, columnsTab]);

    // Auto-select columns tab when dialog opens
    useEffect(() => {
        if (open && columnsTab && !selectedTabId) {
            setSelectedTabId(columnsTab.id);
        }
    }, [open, columnsTab, selectedTabId, setSelectedTabId]);

    const handleSave = async () => {
        await save();
    };

    const handleCancel = () => {
        cancel();
        onClose();
    };

    const hasChanges = useMemo(() => {
        if (!columnField) return false;
        const { arrayField, columnIndex } = columnField;
        const currentColumns = formData[arrayField.id] || arrayField.value || [];
        const currentColumn = currentColumns[columnIndex];
        const originalColumn = (arrayField.value as any[])?.[columnIndex];

        if (!currentColumn || !originalColumn) return false;

        // Check if any field in the column has changed
        const templateFields = arrayField.fields?.[0]?.fields || [];
        return templateFields.some((field: any) => {
            const currentValue = currentColumn[field.id];
            const originalValue = originalColumn[field.id];
            return currentValue !== originalValue;
        });
    }, [columnField, formData]);

    if (!columnField) {
        return (
            <Dialog open={open} onClose={handleCancel} maxWidth='md' fullWidth>
                <DialogTitle>Edit Column: {columnName}</DialogTitle>
                <DialogContent>
                    <Box p={4} display='flex' justifyContent='center'>
                        {isLoading ? <CircularProgress /> : <Typography>Column not found</Typography>}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancel}>Close</Button>
                </DialogActions>
            </Dialog>
        );
    }

    const { arrayField, columnIndex } = columnField;
    const templateFields = arrayField.fields?.[0]?.fields || [];
    const currentColumns = formData[arrayField.id] || arrayField.value || [];
    const currentColumn = currentColumns[columnIndex] || {};

    // Create a single column form by mapping the array item to individual fields
    const columnFields = templateFields.map((field: any) => ({
        ...field,
        value: currentColumn[field.id] ?? field.value,
        originalValue: (arrayField.value as any[])?.[columnIndex]?.[field.id]
    }));

    return (
        <Dialog open={open} onClose={handleCancel} maxWidth='md' fullWidth>
            <DialogTitle>
                <Box display='flex' alignItems='center' justifyContent='space-between'>
                    <Typography variant='h6'>Edit Column: {columnName}</Typography>
                    {isLoading && <CircularProgress size={20} />}
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                <Box display='flex' flexDirection='column' height='50vh'>
                    <Box flex={1} overflow='auto' mt={2}>
                        {columnFields.length > 0 ? (
                            <TableForm
                                formSchema={columnFields}
                                formData={currentColumn}
                                onFieldChange={(fieldId, value) => {
                                    // Update the column in the array
                                    const updatedColumns = [...currentColumns];
                                    updatedColumns[columnIndex] = {
                                        ...updatedColumns[columnIndex],
                                        [fieldId]: value
                                    };
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
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}

