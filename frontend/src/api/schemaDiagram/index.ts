import { api } from '@/core/api';

export type SchemaDiagramRequest = {
    connectionId: number;
    schema?: string;
};

export type DiagramTable = {
    id: string;
    database?: string; // Database name for constructing nodeId
    schema: string;
    name: string;
    columns: DiagramColumn[];
    primaryKeys: string[];
};

export type DiagramColumn = {
    name: string;
    type: string;
    notNull: boolean;
    default?: string;
    comment?: string;
    isPrimary: boolean;
    isForeign: boolean;
};

export type DiagramRelationship = {
    id: string;
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
    constraintName: string;
    onDelete?: string;
    onUpdate?: string;
};

export type DiagramLayout = {
    nodes: DiagramNodePosition[];
    edges?: DiagramEdgePosition[];
};

export type DiagramNodePosition = {
    tableId: string;
    x: number;
    y: number;
};

export type DiagramEdgePosition = {
    edgeId: string;
};

export type SchemaDiagramResponse = {
    database?: string; // Current database name
    tables: DiagramTable[];
    relationships: DiagramRelationship[];
    layout?: DiagramLayout;
};

export type SaveLayoutRequest = {
    connectionId: number;
    schema: string;
    layout: DiagramLayout;
};

export type SaveRelationshipRequest = {
    connectionId: number;
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
    constraintName: string;
    onDelete?: string;
    onUpdate?: string;
};

export type DeleteRelationshipRequest = {
    connectionId: number;
    constraintName: string;
    table: string;
};

const endpoint = {
    getDiagram: (): string => '/schema-diagram',
    saveLayout: (): string => '/schema-diagram/layout',
    createRelationship: (): string => '/schema-diagram/relationship',
    deleteRelationship: (): string => '/schema-diagram/relationship'
};

export const getDiagram = async (params: SchemaDiagramRequest): Promise<SchemaDiagramResponse> => {
    return (await api.get(endpoint.getDiagram(), { params })).data.data as SchemaDiagramResponse;
};

export const saveLayout = async (data: SaveLayoutRequest): Promise<void> => {
    await api.post(endpoint.saveLayout(), data);
};

export const createRelationship = async (data: SaveRelationshipRequest): Promise<void> => {
    await api.post(endpoint.createRelationship(), data);
};

export const deleteRelationship = async (data: DeleteRelationshipRequest): Promise<void> => {
    await api.delete(endpoint.deleteRelationship(), { data });
};

