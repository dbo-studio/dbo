import CustomIcon from '@/components/base/CustomIcon/CustomIcon';
import type { ViewColumn } from '@/core/diagram/types';
import locales from '@/locales';
import { useTheme } from '@mui/material';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo, type JSX } from 'react';
import {
  AccentBarStyled,
  ColumnKeyIconStyled,
  ColumnMetaStyled,
  ColumnNameStyled,
  ColumnRowStyled,
  ColumnsStyled,
  ColumnTypeStyled,
  EmptyColumnsStyled,
  HeaderIconStyled,
  HeaderStyled,
  HeaderTextStyled,
  KeyBadgeStyled,
  SchemaNameStyled,
  TableNameStyled,
  TableNodeCardStyled
} from './TableNode.styled';

export type TableNodeData = {
  name: string;
  schema?: string;
  columns: ViewColumn[];
  status: ViewColumn['status'];
  highlighted: boolean;
  dimmed: boolean;
};

export type TableFlowNode = Node<TableNodeData, 'table'>;

function KeyBadge({ label, color }: { label: string; color: string }): JSX.Element {
  return <KeyBadgeStyled badgeColor={color}>{label}</KeyBadgeStyled>;
}

function TableNodeComponent({ data, selected }: NodeProps<TableFlowNode>): JSX.Element {
  const theme = useTheme();
  const highlighted = data.highlighted || selected;

  let accent = theme.palette.primary.main;
  if (data.status === 'added') {
    accent = theme.palette.success.main;
  } else if (data.status === 'changed') {
    accent = theme.palette.warning.main;
  } else if (data.status === 'removed') {
    accent = theme.palette.error.main;
  }

  const title = data.schema ? `${data.schema}.${data.name}` : data.name;
  const handleColor = highlighted ? accent : theme.palette.text.disabled;
  const fkColor = theme.palette.info.main;
  const handleStyle = {
    width: 8,
    height: 8,
    border: `1.5px solid ${theme.palette.background.paper}`,
    background: handleColor,
    top: '50%'
  };

  return (
    <TableNodeCardStyled
      data-testid={`diagram-node-${data.name}`}
      data-highlighted={highlighted ? 'true' : 'false'}
      data-status={data.status}
      accent={accent}
      highlighted={highlighted}
      dimmed={data.dimmed}
    >
      <AccentBarStyled accent={accent} highlighted={highlighted} />

      <HeaderStyled>
        <HeaderIconStyled accent={accent}>
          <CustomIcon type='sheet' size='xs' color={accent} />
        </HeaderIconStyled>
        <HeaderTextStyled>
          <TableNameStyled variant='subtitle2' noWrap title={title}>
            {data.name}
          </TableNameStyled>
          {data.schema ? (
            <SchemaNameStyled variant='caption' noWrap title={data.schema}>
              {data.schema}
            </SchemaNameStyled>
          ) : null}
        </HeaderTextStyled>
      </HeaderStyled>

      <ColumnsStyled>
        {data.columns.length === 0 ? (
          <EmptyColumnsStyled variant='caption'>{locales.diagram_no_columns}</EmptyColumnsStyled>
        ) : (
          data.columns.map((column, index) => (
            <ColumnRowStyled
              key={column.name}
              data-testid={`diagram-col-${data.name}-${column.name}`}
              removed={column.status === 'removed'}
              striped={index % 2 === 1}
            >
              <Handle type='target' position={Position.Left} id={column.name} style={handleStyle} />

              <ColumnKeyIconStyled>
                {column.isPrimaryKey ? (
                  <CustomIcon type='key' size='xs' color={theme.palette.warning.main} />
                ) : column.isForeignKey ? (
                  <CustomIcon type='network' size='xs' color={fkColor} />
                ) : null}
              </ColumnKeyIconStyled>

              <ColumnNameStyled className='nodrag nopan' variant='caption' noWrap primary={column.isPrimaryKey}>
                {column.name}
              </ColumnNameStyled>

              <ColumnMetaStyled>
                {column.isPrimaryKey ? (
                  <KeyBadge label={locales.diagram_pk} color={theme.palette.warning.main} />
                ) : null}
                {column.isForeignKey ? <KeyBadge label={locales.diagram_fk} color={fkColor} /> : null}
                <ColumnTypeStyled className='nodrag nopan' variant='caption' noWrap title={column.dataType}>
                  {column.dataType}
                </ColumnTypeStyled>
              </ColumnMetaStyled>

              <Handle type='source' position={Position.Right} id={column.name} style={handleStyle} />
            </ColumnRowStyled>
          ))
        )}
      </ColumnsStyled>
    </TableNodeCardStyled>
  );
}

function tableNodePropsEqual(prev: NodeProps<TableFlowNode>, next: NodeProps<TableFlowNode>): boolean {
  return (
    prev.selected === next.selected &&
    prev.data.name === next.data.name &&
    prev.data.schema === next.data.schema &&
    prev.data.status === next.data.status &&
    prev.data.highlighted === next.data.highlighted &&
    prev.data.dimmed === next.data.dimmed &&
    prev.data.columns === next.data.columns
  );
}

export default memo(TableNodeComponent, tableNodePropsEqual);
