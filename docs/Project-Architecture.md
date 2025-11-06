# DBO Studio - معماری و راهنمای کامل پروژه

این داکیومنت شامل تمام جزئیات معماری، ساختار، و نحوه کار کردن پروژه DBO Studio است.

---

## 📋 فهرست مطالب

1. [معماری کلی](#معماری-کلی)
2. [ساختار Backend](#ساختار-backend)
3. [ساختار Frontend](#ساختار-frontend)
4. [Database Repository Pattern](#database-repository-pattern)
5. [API Endpoints](#api-endpoints)
6. [Data Flow](#data-flow)
7. [State Management](#state-management)
8. [Key Components](#key-components)
9. [Database Support](#database-support)
10. [Connection Management](#connection-management)

---

## معماری کلی

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop App (Tauri)                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Frontend (React + TypeScript + Vite)       │   │
│  │  - React 18 + TypeScript                            │   │
│  │  - Zustand (State Management)                      │   │
│  │  - TanStack Query (Data Fetching)                  │   │
│  │  - Material-UI (UI Components)                     │   │
│  │  - Monaco Editor (SQL Editor)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          │ HTTP API                         │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Go + Fiber)                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         API Layer (Handlers)                        │   │
│  │  - TreeHandler, QueryHandler, ConnectionHandler     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Service Layer                                │   │
│  │  - TreeService, QueryService, ConnectionService     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Repository Layer                             │   │
│  │  - DatabaseRepository (Interface)                   │   │
│  │  - PostgresRepository, SQLiteRepository             │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Database Connections                         │   │
│  │  - PostgreSQL, SQLite                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## ساختار Backend

### 1. Directory Structure

```
backend/
├── cmd/                    # CLI commands
│   └── cmd.go             # Serve command
├── config/                 # Configuration
│   └── config.go
├── internal/
│   ├── app/
│   │   ├── dto/           # Data Transfer Objects
│   │   ├── handler/       # HTTP Handlers (Fiber)
│   │   │   ├── tree.go
│   │   │   ├── query.go
│   │   │   ├── connection.go
│   │   │   └── ...
│   │   └── server/
│   │       ├── server.go   # Fiber server setup
│   │       ├── route.go    # Route definitions
│   │       └── middleware.go
│   ├── database/
│   │   ├── contract/      # Database repository interface
│   │   │   └── contract.go
│   │   ├── postgres/       # PostgreSQL implementation
│   │   │   ├── postgres.go
│   │   │   ├── tree.go
│   │   │   ├── execute.go
│   │   │   ├── objects.go
│   │   │   └── ...
│   │   ├── sqlite/         # SQLite implementation
│   │   │   └── ...
│   │   ├── connection/     # Connection management
│   │   └── repository.go   # Factory for creating repositories
│   ├── model/              # Database models (GORM)
│   │   ├── connection.go
│   │   ├── saved_query.go
│   │   └── ...
│   ├── repository/         # Data access layer
│   │   ├── connection_repository.go
│   │   └── ...
│   └── service/            # Business logic layer
│       ├── tree/
│       ├── query/
│       ├── connection/
│       └── ...
├── pkg/                    # Shared packages
│   ├── apperror/          # Error handling
│   ├── cache/             # Caching
│   ├── db/                # Database setup
│   ├── helper/            # Utilities
│   ├── logger/            # Logging
│   └── response/          # HTTP response helpers
└── main.go                # Entry point
```

### 2. Server Initialization Flow

```go
// main.go
main() 
  → cmd.Execute()
    → cmd.ServeCommand()
      → cmd.Execute()
        → config.New()                    // Load config
        → logger.New()                    // Setup logger
        → db.New()                        // Setup database
        → database.AutoMigrate()          // Run migrations
        → repository.NewRepository()      // Create repositories
        → service.NewService()            // Create services
        → server.New()                    // Create HTTP server
        → server.Start()                  // Start listening
```

### 3. Request Flow

```
HTTP Request
  → Fiber Router (route.go)
    → Handler (handler/*.go)
      → Service (service/*.go)
        → Repository (repository/*.go)
          → Database Repository (database/*/repository.go)
            → Database Connection
              → SQL Query Execution
```

### 4. Key Backend Components

#### 4.1 Database Repository Interface

```go
// backend/internal/database/contract/contract.go
type DatabaseRepository interface {
    Version() (string, error)
    RunQuery(dto *dto.RunQueryRequest) (*dto.RunQueryResponse, error)
    UpdateQuery(dto *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error)
    RunRawQuery(dto *dto.RawQueryRequest) (*dto.RawQueryResponse, error)
    Tree(parentID string) (*TreeNode, error)
    GetFormTabs(action TreeNodeActionName) []FormTab
    GetFormFields(nodeID string, tabID TreeTab, action TreeNodeActionName) []FormField
    Objects(nodeID string, tabID TreeTab, action TreeNodeActionName) ([]FormField, error)
    Execute(nodeID string, action TreeNodeActionName, params []byte) error
    AutoComplete(dto *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error)
    ImportData(job dto.ImportJob, rows [][]string, columns []string) (*ImportResult, error)
    AiContext(dto *dto.AiChatRequest) (string, error)
    AiCompleteContext(dto *dto.AiInlineCompleteRequest) string
}
```

#### 4.2 Repository Factory

```go
// backend/internal/database/repository.go
func NewDatabaseRepository(connection *model.Connection, cm *ConnectionManager) (DatabaseRepository, error) {
    switch connection.ConnectionType {
    case "postgresql":
        return databasePostgres.NewPostgresRepository(connection, cm)
    case "sqlite":
        return databaseSqlite.NewSQLiteRepository(connection, cm)
    default:
        return nil, fmt.Errorf("unsupported database type: %s", connection.ConnectionType)
    }
}
```

---

## ساختار Frontend

### 1. Directory Structure

```
frontend/
├── src/
│   ├── api/                # API client functions
│   │   ├── tree/
│   │   ├── query/
│   │   ├── connection/
│   │   └── ...
│   ├── components/
│   │   ├── base/           # Base UI components
│   │   ├── common/         # Common components
│   │   │   ├── AddConnection/
│   │   │   ├── ObjectTreeView/
│   │   │   └── ...
│   │   └── layout/         # Layout components
│   ├── core/
│   │   ├── api/            # API client setup
│   │   ├── theme/          # Theme configuration
│   │   ├── utils/          # Utilities
│   │   └── indexedDB/      # IndexedDB service
│   ├── hooks/              # Custom React hooks
│   │   ├── useCurrentConnection.hook.ts
│   │   ├── useSelectedTab.hook.ts
│   │   └── ...
│   ├── routes/             # Route components
│   │   ├── Data/           # Data grid view
│   │   ├── ObjectForm/      # Schema editor form
│   │   └── Query/           # SQL query editor
│   ├── store/               # Zustand stores
│   │   ├── connectionStore/
│   │   ├── tabStore/
│   │   ├── dataStore/
│   │   ├── treeStore/
│   │   └── ...
│   ├── types/               # TypeScript types
│   ├── locales/             # i18n translations
│   └── main.tsx             # Entry point
└── package.json
```

### 2. Application Initialization

```typescript
// main.tsx
ReactDOM.createRoot()
  → ThemeProvider
    → QueryClientProvider
      → Home (routes/index.tsx)
        → useStartup() hook
          → Layout
            → StartContainer (Sidebar)
            → ExplorerContainer (Tree View)
            → CenterContainer (Main Content)
            → EndContainer (Right Panel)
```

### 3. Key Frontend Components

#### 3.1 Layout Structure

```typescript
// components/layout/Layout.tsx
<Layout>
  <AppHeader />
  <Grid container>
    <StartContainer />        // Left sidebar
    <ExplorerContainer />     // Tree view (if enabled)
    <CenterContainer />       // Main content area
    <EndContainer />          // Right panel (if enabled)
  </Grid>
</Layout>
```

#### 3.2 Routes

- **Query Route**: SQL query editor with Monaco Editor
- **Data Route**: Data grid for query results
- **ObjectForm Route**: Dynamic form for schema editing

---

## Database Repository Pattern

### 1. Interface Definition

هر دیتابیس باید `DatabaseRepository` interface را implement کند:

```go
type DatabaseRepository interface {
    // Query execution
    RunQuery(dto *dto.RunQueryRequest) (*dto.RunQueryResponse, error)
    UpdateQuery(dto *dto.UpdateQueryRequest) (*dto.UpdateQueryResponse, error)
    
    // Tree structure
    Tree(parentID string) (*TreeNode, error)
    
    // Form generation
    GetFormTabs(action TreeNodeActionName) []FormTab
    GetFormFields(nodeID string, tabID TreeTab, action TreeNodeActionName) []FormField
    Objects(nodeID string, tabID TreeTab, action TreeNodeActionName) ([]FormField, error)
    
    // Schema operations
    Execute(nodeID string, action TreeNodeActionName, params []byte) error
    
    // Auto-completion
    AutoComplete(dto *dto.AutoCompleteRequest) (*dto.AutoCompleteResponse, error)
}
```

### 2. PostgreSQL Implementation

```go
// backend/internal/database/postgres/postgres.go
type PostgresRepository struct {
    connection *model.Connection
    db         *gorm.DB
    cm         *ConnectionManager
}

func (r *PostgresRepository) Tree(parentID string) (*TreeNode, error) {
    // Build tree structure based on parentID
    // Returns: Database → Schemas → Tables/Views/etc.
}

func (r *PostgresRepository) Execute(nodeID string, action TreeNodeActionName, params []byte) error {
    // Parse params
    // Generate SQL queries based on action
    // Execute queries in transaction
}
```

### 3. SQLite Implementation

```go
// Similar structure but adapted for SQLite
// No schema support (SQLite doesn't have schemas)
```

---

## API Endpoints

### 1. Tree Endpoints

```
GET  /api/tree?connectionId={id}&parentId={parentId}
     → Returns tree structure for database

GET  /api/tree/:nodeId/tabs/:action?connectionId={id}
     → Returns available tabs for a node

GET  /api/tree/:nodeId/tabs/:action/fields/:tabId?connectionId={id}
     → Returns form fields for a tab (empty form)

GET  /api/tree/:nodeId/tabs/:action/fields/:tabId/object?connectionId={id}
     → Returns form fields with current object data

POST /api/tree/:nodeId/tabs/:action/fields/object?connectionId={id}
     → Execute action (CREATE/EDIT/DROP)
     Body: { "tabId": { "new": {...}, "old": {...} } }
```

### 2. Query Endpoints

```
POST /api/query/run
     → Execute SELECT query
     Body: { connectionId, query, limit, offset }

POST /api/query/update
     → Execute UPDATE/DELETE query
     Body: { connectionId, nodeId, edited, deleted, added }

POST /api/query/raw
     → Execute raw SQL query
     Body: { connectionId, query }

GET  /api/query/autocomplete
     → Get auto-completion suggestions
     Query: { connectionId, query, position }
```

### 3. Connection Endpoints

```
GET    /api/connections
       → List all connections

GET    /api/connections/:id
       → Get connection details

POST   /api/connections
       → Create new connection

POST   /api/connections/ping
       → Test connection

PATCH  /api/connections/:id
       → Update connection

DELETE /api/connections/:id
       → Delete connection
```

---

## Data Flow

### 1. Tree View Flow

```
User clicks tree node
  → ObjectTreeView component
    → useTreeStore.getTree()
      → api.tree.getTree()
        → Backend: GET /api/tree
          → TreeService.Tree()
            → DatabaseRepository.Tree()
              → Build tree structure
                → Return TreeNode
                  → Update treeStore
                    → Render tree nodes
```

### 2. Object Form Flow

#### 2.1 Opening Form

```
User right-clicks node → "Edit"
  → Create new tab
    → useObjectTabs()
      → api.tree.getTabs()
        → Backend: GET /api/tree/:nodeId/tabs/:action
          → DatabaseRepository.GetFormTabs()
            → Return available tabs
              → Render tabs
                → useObjectFields()
                  → api.tree.getObject()
                    → Backend: GET /api/tree/:nodeId/tabs/:action/fields/:tabId/object
                      → DatabaseRepository.Objects()
                        → Query database for current values
                          → Return FormField[] with values
                            → Populate form
```

#### 2.2 Saving Form

```
User clicks "Save"
  → useObjectActions.handleSave()
    → Transform form data to new/old format
      → api.tree.executeAction()
        → Backend: POST /api/tree/:nodeId/tabs/:action/fields/object
          → TreeService.ObjectExecute()
            → DatabaseRepository.Execute()
              → Parse params
                → Generate SQL queries
                  → Execute in transaction
                    → Success
                      → Invalidate queries
                        → Reload tree
                          → Show success message
```

### 3. Query Execution Flow

```
User writes SQL query
  → User clicks "Run"
    → useDataStore.runQuery()
      → api.query.run()
        → Backend: POST /api/query/run
          → QueryService.Run()
            → DatabaseRepository.RunQuery()
              → Execute query
                → Return rows + columns
                  → Store in IndexedDB
                    → Update dataStore
                      → Render DataGrid
```

---

## State Management

### 1. Zustand Stores

#### 1.1 Connection Store

```typescript
// store/connectionStore/connection.store.ts
{
  connections: ConnectionType[],
  currentConnectionId: number | undefined,
  setCurrentConnection: (id: number) => void,
  // ...
}
```

#### 1.2 Tab Store

```typescript
// store/tabStore/tab.store.ts
{
  tabs: TabType[],
  selectedTabId: string | undefined,
  getTabs: () => TabType[],
  selectedTab: () => TabType | undefined,
  updateTabs: (tabs: TabType[]) => void,
  updateSelectedTab: (tab: TabType) => void,
  // Query, Filter, Sort, Column slices
}
```

#### 1.3 Data Store

```typescript
// store/dataStore/data.store.ts
{
  rows: RowType[],
  columns: ColumnType[],
  editedRows: RowType[],
  removedRows: RowType[],
  formDataByTab: Record<string, Record<string, FormFieldType[]>>,
  runQuery: () => Promise<void>,
  updateRows: (rows: RowType[]) => void,
  updateFormData: (tabId: string, tabId: string, fields: FormFieldType[]) => void,
  // ...
}
```

#### 1.4 Tree Store

```typescript
// store/treeStore/tree.store.ts
{
  tree: TreeNodeType | null,
  getTree: (connectionId: number, parentId: string | null) => Promise<void>,
  reloadTree: (fromCache: boolean) => void,
  // ...
}
```

### 2. Data Persistence

- **Tab Store**: Persisted to localStorage (Zustand persist middleware)
- **Data Store**: Persisted to IndexedDB (custom service)
- **Tree Store**: Cached in backend (30 minutes)

---

## Key Components

### 1. ObjectTreeView

```typescript
// components/common/ObjectTreeView/ObjectTreeView.tsx
- Renders database tree structure
- Handles node expansion (lazy loading)
- Context menu for actions (Create/Edit/Drop)
- Creates tabs when actions triggered
```

### 2. ObjectForm

```typescript
// routes/ObjectForm/ObjectForm.tsx
- Dynamic form based on database type
- Multiple tabs (General, Columns, Foreign Keys, etc.)
- Form fields generated from backend
- Handles CREATE/EDIT/DROP actions
```

### 3. Query Editor

```typescript
// routes/Query/Query.tsx
- Monaco Editor for SQL
- Auto-completion
- Query execution
- Results in Data route
```

### 4. Data Grid

```typescript
// routes/Data/Data.tsx
- Displays query results
- Editable cells
- Filtering, sorting, pagination
- Column visibility
```

---

## Database Support

### 1. PostgreSQL

**Features:**
- Full schema support
- Tables, Views, Materialized Views
- Foreign Keys, Indexes, Triggers
- Sequences, Checks, Keys

**Tree Structure:**
```
Connection
  └── Database
      └── Schema
          ├── Tables
          ├── Views
          ├── Materialized Views
          └── ...
```

### 2. SQLite

**Features:**
- No schema support (single database)
- Tables, Views
- Foreign Keys, Indexes
- Triggers

**Tree Structure:**
```
Connection
  └── Database
      ├── Tables
      ├── Views
      └── ...
```

---

## Connection Management

### 1. Connection Types

```typescript
type ConnectionType = {
  id: number;
  name: string;
  type: 'postgresql' | 'sqlite';
  options: {
    // PostgreSQL
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    uri?: string;
    
    // SQLite
    path?: string;
  };
};
```

### 2. Connection Lifecycle

```
Create Connection
  → Test connection (ping)
    → Save to database
      → Add to connectionStore
        → Available in sidebar

Select Connection
  → Set as currentConnection
    → Load tree structure
      → Show in ExplorerContainer

Delete Connection
  → Remove from database
    → Remove from connectionStore
      → Close related tabs
```

### 3. Connection Manager (Backend)

```go
// backend/internal/database/connection/connection.go
type ConnectionManager struct {
    connections map[int]*gorm.DB  // Connection pool
    // Manages database connections
    // Reuses connections
    // Handles connection errors
}
```

---

## Form Data Structure

### 1. FormField Type

```typescript
type FormFieldType = {
  id: string;                    // Field identifier
  name: string;                   // Display name
  type: string;                   // 'text' | 'number' | 'select' | 'array' | ...
  required: boolean;
  value?: any;                    // Current value
  originalValue?: any;             // Original value (for comparison)
  fields?: FormFieldType[];       // Nested fields (for arrays)
  deleted?: boolean;              // Marked for deletion
  added?: boolean;                 // Newly added
};
```

### 2. Save Format

```typescript
// Frontend transforms form data to this format:
{
  "tabId": {
    "fieldId": {
      "new": { "id": "value" },    // Changed values
      "old": { "id": "oldValue" }  // Original values
    },
    "arrayField": [
      {
        "new": { ... },
        "old": { ... },
        "added": true              // New item
      },
      {
        "new": { ... },
        "old": { ... },
        "deleted": true            // Deleted item
      }
    ]
  }
}
```

### 3. Backend Processing

```go
// Backend receives the format above
// For each tab:
//   - Compare new vs old
//   - Generate appropriate SQL:
//     - CREATE: new values only
//     - EDIT: new values with old as WHERE condition
//     - DROP: old values as WHERE condition
```

---

## Error Handling

### 1. Backend Errors

```go
// pkg/apperror/errors.go
type AppError struct {
    Code    string
    Message string
    Status  int
}

// Common errors:
// - ErrConnectionNotFound
// - ErrInvalidRequest
// - ErrDriverError
// - ErrInternalServerError
```

### 2. Frontend Error Handling

```typescript
// API calls wrapped in try-catch
// Errors shown via toast notifications
// Query errors displayed in query editor
// Form validation errors inline
```

---

## Caching Strategy

### 1. Backend Caching

- **Tree Structure**: Cached for 30 minutes
- **Connection Pool**: Reused connections
- **Query Results**: Not cached (always fresh)

### 2. Frontend Caching

- **Tab State**: Persisted in localStorage
- **Query Results**: Stored in IndexedDB
- **Form Data**: Stored in Zustand store (in-memory)

---

## Development Workflow

### 1. Adding New Database Type

1. Create new directory: `backend/internal/database/{dbtype}/`
2. Implement `DatabaseRepository` interface
3. Add to factory: `backend/internal/database/repository.go`
4. Add connection type: `backend/internal/database/contract/database_enum.go`
5. Create connection handler: `backend/internal/database/connection/{dbtype}_connection.go`

### 2. Adding New Form Field Type

1. Add field type: `backend/internal/database/contract/tree_form_field_type_enum.go`
2. Implement in `GetFormFields()` method
3. Add rendering in frontend: `routes/ObjectForm/TableForm/SimpleField.tsx`

### 3. Adding New Action

1. Add action: `backend/internal/database/contract/tree_node_action_name_enum.go`
2. Implement in `Execute()` method
3. Add context menu item: `backend/internal/database/{dbtype}/actions.go`

---

## نکات مهم

1. **Repository Pattern**: هر دیتابیس یک repository جدا دارد که `DatabaseRepository` interface را implement می‌کند.

2. **Dynamic Forms**: فرم‌ها از backend generate می‌شوند بر اساس database type و object type.

3. **Tree Structure**: Tree به صورت lazy load می‌شود (children فقط وقتی expand می‌شود load می‌شود).

4. **Tab Management**: هر action یک tab جدید ایجاد می‌کند که می‌تواند form یا query editor باشد.

5. **Data Transformation**: Frontend form data به `new/old` format تبدیل می‌شود برای backend.

6. **Connection Pooling**: Backend از connection manager استفاده می‌کند برای reuse کردن connections.

7. **State Persistence**: Tab state در localStorage و query results در IndexedDB ذخیره می‌شوند.

---

این داکیومنت شامل تمام جزئیات مهم پروژه است. برای جزئیات بیشتر به کد منبع مراجعه کنید.

