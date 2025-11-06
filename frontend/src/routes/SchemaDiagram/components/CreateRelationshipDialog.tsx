import type { DiagramTable, SaveRelationshipRequest } from '@/api/schemaDiagram';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';

type CreateRelationshipDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SaveRelationshipRequest) => Promise<void>;
  sourceTable: DiagramTable | null;
  targetTable: DiagramTable | null;
  sourceColumn?: string;
  targetColumn?: string;
  connectionId: number;
};

export default function CreateRelationshipDialog({
  open,
  onClose,
  onSubmit,
  sourceTable,
  targetTable,
  sourceColumn: initialSourceColumn,
  targetColumn: initialTargetColumn,
  connectionId
}: CreateRelationshipDialogProps) {
  const [sourceColumn, setSourceColumn] = useState<string>(initialSourceColumn || '');
  const [targetColumn, setTargetColumn] = useState<string>(initialTargetColumn || '');
  const [constraintName, setConstraintName] = useState<string>('');
  const [onDelete, setOnDelete] = useState<string>('NO ACTION');
  const [onUpdate, setOnUpdate] = useState<string>('NO ACTION');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialSourceColumn) setSourceColumn(initialSourceColumn);
    if (initialTargetColumn) setTargetColumn(initialTargetColumn);
    if (sourceTable && sourceColumn && targetTable) {
      setConstraintName(`fk_${sourceTable.name}_${sourceColumn}`);
    }
  }, [initialSourceColumn, initialTargetColumn, sourceTable, sourceColumn, targetTable]);

  const handleSubmit = async (): Promise<void> => {
    if (!sourceTable || !targetTable || !sourceColumn || !targetColumn) return;

    setLoading(true);
    try {
      await onSubmit({
        connectionId,
        sourceTable: `${sourceTable.schema}.${sourceTable.name}`,
        sourceColumn,
        targetTable: `${targetTable.schema}.${targetTable.name}`,
        targetColumn,
        constraintName: constraintName || `fk_${sourceTable.name}_${sourceColumn}`,
        onDelete,
        onUpdate
      });
      onClose();
    } catch (error) {
      console.error('Error creating relationship:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Create Foreign Key Relationship</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box>
            <Typography variant='subtitle2' color='text.secondary'>
              Source Table
            </Typography>
            <Typography variant='body1'>{sourceTable ? `${sourceTable.schema}.${sourceTable.name}` : ''}</Typography>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Source Column</InputLabel>
            <Select value={sourceColumn} onChange={(e) => setSourceColumn(e.target.value)} label='Source Column'>
              {sourceTable?.columns.map((col) => (
                <MenuItem key={col.name} value={col.name}>
                  {col.name} ({col.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Typography variant='subtitle2' color='text.secondary'>
              Target Table
            </Typography>
            <Typography variant='body1'>{targetTable ? `${targetTable.schema}.${targetTable.name}` : ''}</Typography>
          </Box>

          <FormControl fullWidth>
            <InputLabel>Target Column</InputLabel>
            <Select value={targetColumn} onChange={(e) => setTargetColumn(e.target.value)} label='Target Column'>
              {targetTable?.columns.map((col) => (
                <MenuItem key={col.name} value={col.name}>
                  {col.name} ({col.type})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label='Constraint Name'
            value={constraintName}
            onChange={(e) => setConstraintName(e.target.value)}
            placeholder='Auto-generated if empty'
          />

          <FormControl fullWidth>
            <InputLabel>On Delete</InputLabel>
            <Select value={onDelete} onChange={(e) => setOnDelete(e.target.value)} label='On Delete'>
              <MenuItem value='NO ACTION'>NO ACTION</MenuItem>
              <MenuItem value='RESTRICT'>RESTRICT</MenuItem>
              <MenuItem value='CASCADE'>CASCADE</MenuItem>
              <MenuItem value='SET NULL'>SET NULL</MenuItem>
              <MenuItem value='SET DEFAULT'>SET DEFAULT</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>On Update</InputLabel>
            <Select value={onUpdate} onChange={(e) => setOnUpdate(e.target.value)} label='On Update'>
              <MenuItem value='NO ACTION'>NO ACTION</MenuItem>
              <MenuItem value='RESTRICT'>RESTRICT</MenuItem>
              <MenuItem value='CASCADE'>CASCADE</MenuItem>
              <MenuItem value='SET NULL'>SET NULL</MenuItem>
              <MenuItem value='SET DEFAULT'>SET DEFAULT</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant='contained' disabled={loading || !sourceColumn || !targetColumn}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
