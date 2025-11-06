import type { DiagramTable } from '@/api/schemaDiagram';
import { TabMode } from '@/core/enums';
import { useCurrentConnection } from '@/hooks';
import { useTabStore } from '@/store/tabStore/tab.store';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import AddColumnDialog from './AddColumnDialog';
import EditColumnDialog from './EditColumnDialog';
import './TableNode.css';

type TableNodeData = {
  table: DiagramTable;
  onRefresh?: () => void;
};

function TableNode({ data, selected }: NodeProps<TableNodeData>) {
  const { table, onRefresh } = data;
  const currentConnection = useCurrentConnection();
  const addObjectTab = useTabStore((state) => state.addObjectTab);
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);
  const [editColumnDialog, setEditColumnDialog] = useState<{
    open: boolean;
    columnName: string;
  }>({
    open: false,
    columnName: ''
  });

  // Construct nodeId for the table
  const nodeId = useMemo(() => {
    if (table.database) {
      // Construct full nodeId: database.schema.table
      return `${table.database}.${table.schema}.${table.name}`;
    }
    // Fallback: use table.id which is "schema.table"
    return table.id;
  }, [table]);

  const handleEditTable = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!currentConnection?.id) return;
    // Link to ObjectForm page
    addObjectTab(`Edit ${table.name}`, nodeId, 'editTable', TabMode.Object);
  };

  const handleAddColumn = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (!currentConnection?.id) return;
    setAddColumnDialogOpen(true);
  };

  const handleEditColumn = (e: React.MouseEvent, columnName: string): void => {
    e.stopPropagation();
    if (!currentConnection?.id) return;
    setEditColumnDialog({
      open: true,
      columnName
    });
  };

  const handleDeleteColumn = (e: React.MouseEvent, columnName: string): void => {
    e.stopPropagation();
    // TODO: Implement delete column functionality
    console.log('Delete column:', columnName);
  };

  return (
    <Box
      className={`table-node ${selected ? 'selected' : ''}`}
      sx={{
        minWidth: 200,
        backgroundColor: 'background.paper',
        border: selected ? 2 : 1,
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: 1,
        boxShadow: 2
      }}
    >
      <Box
        sx={{
          p: 1,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'primary.main',
          color: 'primary.contrastText'
        }}
      >
        <Typography variant='subtitle2' fontWeight='bold'>
          {table.name}
        </Typography>
        <Tooltip title='Edit Table'>
          <IconButton
            size='small'
            onClick={handleEditTable}
            sx={{ color: 'inherit' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Edit size={16} />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
        {table.columns.map((column) => (
          <Box
            key={column.name}
            sx={{
              p: 0.75,
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              position: 'relative',
              '&:hover': {
                backgroundColor: 'action.hover',
                '& .column-actions': {
                  opacity: 1
                }
              }
            }}
          >
            <Handle
              type='source'
              position={Position.Right}
              id={column.name}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: column.isForeign ? '#ff6b6b' : '#51cf66'
              }}
            />
            <Handle
              type='target'
              position={Position.Left}
              id={column.name}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: column.isPrimary ? '#4dabf7' : '#868e96'
              }}
            />
            <Typography
              variant='body2'
              sx={{
                flex: 1,
                fontFamily: 'monospace',
                fontWeight: column.isPrimary ? 'bold' : 'normal',
                color: column.isPrimary ? 'primary.main' : 'text.primary'
              }}
            >
              {column.name}
            </Typography>
            <Box display='flex' gap={0.5}>
              {column.isPrimary && (
                <Chip label='PK' size='small' color='primary' sx={{ height: 18, fontSize: '0.65rem' }} />
              )}
              {column.isForeign && (
                <Chip label='FK' size='small' color='error' sx={{ height: 18, fontSize: '0.65rem' }} />
              )}
              {column.notNull && <Chip label='NN' size='small' sx={{ height: 18, fontSize: '0.65rem' }} />}
            </Box>
            <Typography variant='caption' color='text.secondary' sx={{ ml: 1 }}>
              {column.type}
            </Typography>
            <Box
              className='column-actions'
              sx={{
                opacity: 0,
                transition: 'opacity 0.2s',
                display: 'flex',
                gap: 0.5,
                ml: 'auto'
              }}
            >
              <Tooltip title='Edit Column'>
                <IconButton size='small' onClick={(e) => handleEditColumn(e, column.name)} sx={{ p: 0.25 }}>
                  <Edit size={14} />
                </IconButton>
              </Tooltip>
              <Tooltip title='Delete Column'>
                <IconButton
                  size='small'
                  onClick={(e) => handleDeleteColumn(e, column.name)}
                  sx={{ p: 0.25, color: 'error.main' }}
                >
                  <Trash2 size={14} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ))}
      </Box>
      <Box
        sx={{
          p: 0.5,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <Tooltip title='Add Column'>
          <IconButton
            size='small'
            onClick={handleAddColumn}
            sx={{ color: 'primary.main' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Plus size={16} />
          </IconButton>
        </Tooltip>
      </Box>
      <AddColumnDialog
        open={addColumnDialogOpen}
        onClose={() => setAddColumnDialogOpen(false)}
        nodeId={nodeId}
        tableName={table.name}
        onSuccess={() => {
          onRefresh?.();
        }}
      />
      <EditColumnDialog
        open={editColumnDialog.open}
        onClose={() => setEditColumnDialog({ open: false, columnName: '' })}
        nodeId={nodeId}
        columnName={editColumnDialog.columnName}
        onSuccess={() => {
          onRefresh?.();
        }}
      />
    </Box>
  );
}

export default memo(TableNode);
