# Monaco Editor با LSP Implementation - راهنمای کامل

این داکیومنت نحوه پیاده‌سازی Monaco Editor به همراه Language Server Protocol (LSP) را بر اساس بررسی کد منبع Bytebase توضیح می‌دهد.

## 📋 فهرست مطالب

1. [معماری کلی](#معماری-کلی)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend Implementation](#backend-implementation)
4. [WebSocket Connection](#websocket-connection)
5. [Auto-Completion](#auto-completion)
6. [Performance Optimizations](#performance-optimizations)
7. [Best Practices](#best-practices)

---

## معماری کلی

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vue 3 + TypeScript)            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         MonacoEditor Component                       │   │
│  │  - MonacoTextModelEditor.vue                         │   │
│  │  - Lazy loading monaco-editor                        │   │
│  │  - Text model management                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         LSP Client (lsp-client.ts)                  │   │
│  │  - WebSocket connection                              │   │
│  │  - MonacoLanguageClient                              │   │
│  │  - Connection state management                       │   │
│  │  - Heartbeat mechanism                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          │ WebSocket (JSON-RPC 2.0)         │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Go)                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         LSP Server (api/lsp/)                        │   │
│  │  - WebSocket handler                                 │   │
│  │  - JSON-RPC 2.0 handler                             │   │
│  │  - Authentication                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Handler                                      │   │
│  │  - Completion provider                               │   │
│  │  - Diagnostics provider                              │   │
│  │  - In-memory file system (MemFS)                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Implementation

### 1. ساختار کامپوننت‌ها

#### 1.1 MonacoEditor.vue (Wrapper Component)

```typescript
// frontend/src/components/MonacoEditor/MonacoEditor.vue
<template>
  <MonacoTextModelEditor
    ref="textModelEditorRef"
    class="bb-monaco-editor"
    :model="model"
    @update:content="handleContentChange"
    @update:selection="emit('update:selection', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import MonacoTextModelEditor from "./MonacoTextModelEditor.vue";
import { useMonacoTextModel } from "./text-model";

const props = defineProps<{
  content: string;
  filename?: string;
  language?: Language;
}>();

const model = useMonacoTextModel(
  filename,
  content,
  toRef(props, "language")
);
</script>
```

#### 1.2 MonacoTextModelEditor.vue (Main Component)

این کامپوننت اصلی که editor را ایجاد می‌کند:

```typescript
// frontend/src/components/MonacoEditor/MonacoTextModelEditor.vue
<script setup lang="ts">
import { onMounted, ref, shallowRef } from "vue";
import { createMonacoEditor } from "./editor";
import { useAutoComplete } from "./composables";

const props = defineProps<{
  model?: ITextModel;
  autoCompleteContext?: AutoCompleteContext;
  readonly?: boolean;
  // ... other props
}>();

const containerRef = ref<HTMLDivElement>();
const editorRef = shallowRef<IStandaloneCodeEditor>();

onMounted(async () => {
  const editor = await createMonacoEditor({
    container: containerRef.value!,
    options: {
      readOnly: props.readonly,
      ...props.options,
    },
  });

  editorRef.value = editor;

  // Setup composables
  useModel(monaco, editor, toRef(props, "model"));
  useAutoComplete(
    monaco,
    editor,
    toRef(props, "autoCompleteContext"),
    toRef(props, "readonly")
  );
  // ... other composables
});
</script>
```

### 2. Lazy Loading Monaco Editor

```typescript
// frontend/src/components/MonacoEditor/lazy-editor.ts
let monacoModule: typeof monaco | undefined;
const monacoLoadDefer = defer<typeof monaco>();

export const loadMonacoEditor = async (): Promise<typeof monaco> => {
  if (monacoModule) {
    return monacoModule;
  }

  // Dynamic import - creates separate chunk
  monacoModule = await import("monaco-editor");
  monacoLoadDefer.resolve(monacoModule);

  return monacoModule;
};
```

### 3. Monaco Services Initialization

```typescript
// frontend/src/components/MonacoEditor/services.ts
import "@codingame/monaco-vscode-javascript-default-extension";
import "@codingame/monaco-vscode-sql-default-extension";
import getLanguagesServiceOverride from "@codingame/monaco-vscode-languages-service-override";
import getTextMateServiceOverride from "@codingame/monaco-vscode-textmate-service-override";
import getThemeServiceOverride from "@codingame/monaco-vscode-theme-service-override";

window.MonacoEnvironment = {
  getWorker: function (_moduleId, label) {
    const workerFactory = workerLoaders[label];
    if (workerFactory != null) {
      return workerFactory();
    }
    throw new Error(`Worker ${label} not found`);
  },
};

export const initializeMonacoServices = async () => {
  const { initialize: initializeServices } = await import(
    "@codingame/monaco-vscode-api"
  );
  await initializeServices({
    ...getTextMateServiceOverride(),
    ...getThemeServiceOverride(),
    ...getLanguagesServiceOverride(),
  });
};
```

### 4. Editor Creation

```typescript
// frontend/src/components/MonacoEditor/editor.ts
export const createMonacoEditor = async (config: {
  container: HTMLElement;
  options?: MonacoType.editor.IStandaloneEditorConstructionOptions;
}): Promise<MonacoType.editor.IStandaloneCodeEditor> => {
  await initialize();
  const monaco = await loadMonacoEditor();

  const editor = monaco.editor.create(config.container, {
    ...defaultEditorOptions(),
    ...config.options,
  });

  return editor;
};

export const defaultEditorOptions = (): MonacoType.editor.IStandaloneEditorConstructionOptions => {
  return {
    renderValidationDecorations: "on",
    accessibilitySupport: "off",
    theme: "vs",
    tabSize: 2,
    insertSpaces: true,
    autoClosingQuotes: "never",
    detectIndentation: false,
    folding: false,
    automaticLayout: true,
    minimap: { enabled: false },
    wordWrap: "on",
    fixedOverflowWidgets: true,
    fontSize: 14,
    lineHeight: 24,
    scrollBeyondLastLine: false,
    suggestFontSize: 12,
    padding: { top: 8, bottom: 8 },
    renderLineHighlight: "none",
    codeLens: false,
    inlineSuggest: { showToolbar: "never" },
    wordBasedSuggestions: "currentDocument",
    lineNumbers: "on",
    cursorStyle: "line",
    glyphMargin: false,
  };
};
```

### 5. Text Model Management

```typescript
// frontend/src/components/MonacoEditor/text-model.ts
const TextModelMapByFilename = new Map<string, MonacoType.editor.ITextModel>();

const createTextModel = async (
  filename: string,
  content: string,
  language: string
) => {
  if (TextModelMapByFilename.has(filename)) {
    return TextModelMapByFilename.get(filename)!;
  }

  const monaco = await getMonacoEditor();
  const uri = await getUriByFilename(filename);
  const model = monaco.editor.createModel(content, language, uri);
  TextModelMapByFilename.set(filename, model);
  return model;
};

export const useMonacoTextModel = (
  filename: MaybeRef<string>,
  content: MaybeRef<string>,
  language: MaybeRef<Language>,
  sync: boolean = true
) => {
  const model = shallowRef<MonacoType.editor.ITextModel>();

  watch(
    [ready, () => unref(filename), () => unref(language)],
    async ([ready, filename, language]) => {
      if (!ready) return;
      const m = markRaw(
        await createTextModel(filename, unref(content), language)
      );

      if (sync && isRef(content)) {
        m.onDidChangeContent(() => {
          const c = m.getValue();
          if (c !== content.value) {
            content.value = c;
          }
        });
      }

      model.value = m;
    },
    { immediate: true }
  );

  // Debounced content sync
  const debouncedUpdateModel = debounce(
    (model: MonacoType.editor.ITextModel, content: string) => {
      if (model.getValue() === content) return;
      model.setValue(content);
    },
    50
  );

  watch(
    [model, () => unref(content)],
    ([model, content]) => {
      if (!model) return;
      if (model.getValue() === content) return;

      const currentValue = model.getValue();
      if (
        currentValue === "" ||
        Math.abs(content.length - currentValue.length) > 100
      ) {
        model.setValue(content);
      } else {
        debouncedUpdateModel(model, content);
      }
    },
    { immediate: true }
  );

  return model;
};
```

---

## Backend Implementation

### 1. LSP Server Structure

```go
// backend/api/lsp/server.go
type Server struct {
    connectionCount atomic.Uint64
    store           *store.Store
    profile         *config.Profile
    secret          string
    stateCfg        *state.State
    iamManager      *iam.Manager
    licenseService  *enterprise.LicenseService
    authInterceptor *auth.APIAuthInterceptor
}
```

### 2. WebSocket Handler

```go
// backend/api/lsp/lsp.go
func (s *Server) Router(c echo.Context) error {
    // Authenticate user before upgrading WebSocket connection
    accessTokenStr, err := auth.GetTokenFromHeaders(c.Request().Header)
    if err != nil {
        return echo.NewHTTPError(http.StatusUnauthorized, "missing access token")
    }

    user, tokenExpiry, err := s.authInterceptor.AuthenticateToken(
        c.Request().Context(),
        accessTokenStr,
    )
    if err != nil {
        return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
    }

    connection, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
    if err != nil {
        return errors.Wrap(err, "could not upgrade to WebSocket")
    }
    defer connection.Close()

    connectionID := s.connectionCount.Add(1)

    handler, closer := newHandler(
        s.store,
        s.profile,
        s.iamManager,
        user,
        tokenExpiry,
    )
    ctx := c.Request().Context()
    <-jsonrpc2.NewConn(
        ctx,
        wsjsonrpc2.NewObjectStream(connection),
        handler,
        nil,
    ).DisconnectNotify()
    
    return closer.Close()
}
```

### 3. LSP Handler

```go
// backend/api/lsp/handler.go
type Handler struct {
    mu       sync.Mutex
    fs       *MemFS
    init     *lsp.InitializeParams
    metadata *SetMetadataCommandArguments
    store    *store.Store

    user        *store.UserMessage
    tokenExpiry time.Time
    iamManager  *iam.Manager

    shutDown bool
    profile  *config.Profile
    cancelF  sync.Map // map[jsonrpc2.ID]context.CancelFunc

    // Performance optimizations
    diagnosticsDebouncer *DiagnosticsDebouncer
    contentCache         *ContentCache
    perfMonitor          *PerformanceMonitor
}
```

### 4. Request Handling

```go
func (h *Handler) handle(ctx context.Context, conn *jsonrpc2.Conn, req *jsonrpc2.Request) (any, error) {
    // Check token expiry
    if err := h.checkTokenExpiry(); err != nil {
        conn.Close()
        return nil, err
    }

    // Handle ping
    if Method(req.Method) == LSPMethodPing {
        return PingResult{Result: "pong"}, nil
    }

    if err := h.checkInitialized(req); err != nil {
        return nil, err
    }

    switch Method(req.Method) {
    case LSPMethodInitialize:
        var params lsp.InitializeParams
        if err := json.Unmarshal(*req.Params, &params); err != nil {
            return nil, err
        }

        if err := h.reset(&params); err != nil {
            return nil, err
        }

        return lsp.InitializeResult{
            Capabilities: lsp.ServerCapabilities{
                TextDocumentSync: lsp.Incremental,
                CompletionProvider: &lsp.CompletionOptions{
                    TriggerCharacters: []string{".", " "},
                },
                ExecuteCommandProvider: &lsp.ExecuteCommandOptions{
                    Commands: []string{string(CommandNameSetMetadata)},
                },
            },
        }, nil

    case LSPMethodCompletion:
        var params lsp.CompletionParams
        if err := json.Unmarshal(*req.Params, &params); err != nil {
            return nil, err
        }
        childCtx, cancel := context.WithCancel(ctx)
        h.cancelF.Store(req.ID, cancel)
        defer func() {
            cancel()
            h.cancelF.Delete(req.ID)
        }()
        return h.handleTextDocumentCompletion(childCtx, conn, req, params)

    case LSPMethodExecuteCommand:
        var params lsp.ExecuteCommandParams
        if err := json.Unmarshal(*req.Params, &params); err != nil {
            return nil, err
        }

        switch CommandName(params.Command) {
        case CommandNameSetMetadata:
            var setMetadataParams SetMetadataCommandParams
            if err := json.Unmarshal(*req.Params, &setMetadataParams); err != nil {
                return nil, err
            }
            // Check RBAC permissions
            if err := h.checkMetadataPermissions(ctx, setMetadataParams.Arguments[0]); err != nil {
                return nil, &jsonrpc2.Error{
                    Code:    jsonrpc2.CodeInvalidRequest,
                    Message: fmt.Sprintf("permission denied: %v", err),
                }
            }
            h.setMetadata(setMetadataParams.Arguments[0])
            return nil, nil
        }

    default:
        if isFileSystemRequest(req.Method) {
            _, _, err := h.handleFileSystemRequest(ctx, conn, req)
            return nil, err
        }
        return nil, &jsonrpc2.Error{
            Code:    jsonrpc2.CodeMethodNotFound,
            Message: fmt.Sprintf("method not supported: %s", req.Method),
        }
    }
}
```

### 5. In-Memory File System (MemFS)

```go
// backend/api/lsp/fs.go
type MemFS struct {
    mu sync.Mutex
    m  map[string][]byte
}

func (fs *MemFS) DidOpen(params *lsp.DidOpenTextDocumentParams) {
    fs.set(params.TextDocument.URI, []byte(params.TextDocument.Text))
}

func (fs *MemFS) DidChange(params *lsp.DidChangeTextDocumentParams) error {
    content, found := fs.get(params.TextDocument.URI)
    if !found {
        return errors.Errorf("received textDocument/didChange for unknown file %q", params.TextDocument.URI)
    }

    content, err := applyContentChanges(
        params.TextDocument.URI,
        content,
        params.ContentChanges,
    )
    if err != nil {
        return err
    }

    fs.set(params.TextDocument.URI, content)
    return nil
}

func applyContentChanges(
    uri lsp.DocumentURI,
    content []byte,
    changes []lsp.TextDocumentContentChangeEvent,
) ([]byte, error) {
    for _, change := range changes {
        if change.Range == nil && change.RangeLength == 0 {
            content = []byte(change.Text) // new full content
            continue
        }
        start, err := offsetForPosition(content, change.Range.Start)
        if err != nil {
            return nil, errors.Wrapf(err, "invalid position", change.Range.Start)
        }

        end, err := offsetForPosition(content, change.Range.End)
        if err != nil {
            return nil, errors.Wrapf(err, "invalid position", change.Range.End)
        }

        // Apply change using bytes.Buffer for efficiency
        b := &bytes.Buffer{}
        b.Grow(start + len(change.Text) + len(content) - end)
        b.Write(content[:start])
        b.WriteString(change.Text)
        b.Write(content[end:])
        content = b.Bytes()
    }
    return content, nil
}
```

---

## WebSocket Connection

### 1. LSP Client Implementation

```typescript
// frontend/src/components/MonacoEditor/lsp-client.ts
import { MonacoLanguageClient } from "monaco-languageclient";
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from "vscode-ws-jsonrpc";

export type ConnectionState = {
  url: string;
  state: "initial" | "ready" | "closed" | "reconnecting";
  ws: Promise<WebSocket> | undefined;
  lastCommand: ExecuteCommandParams | undefined;
  retries: number;
  heartbeat: {
    timer: NodeJS.Timeout | undefined;
    counter: number;
    timestamp: number;
  };
};

const conn = shallowReactive<ConnectionState>({
  url: createUrl(location.host, "/lsp").toString(),
  state: "initial",
  ws: undefined,
  lastCommand: undefined,
  retries: 0,
  heartbeat: shallowReactive({
    timer: undefined,
    counter: 0,
    timestamp: 0,
  }),
});

const connectWebSocket = () => {
  if (conn.ws) {
    return conn.ws;
  }

  const connect = (
    resolve: (value: WebSocket | PromiseLike<WebSocket>) => void,
    reject: (reason?: any) => void
  ) => {
    const ws = new WebSocket(conn.url);
    const retries = conn.retries++;

    const delay = progressiveDelay(retries);
    console.debug(
      `[LSP-Client] try connecting: state=${conn.state} retries=${retries} delay=${delay}`
    );

    sleep(delay).then(() => {
      const handleError = (code: number, reason: string) => {
        if (conn.state === "closed" || conn.state === "ready") {
          return;
        }

        if (conn.retries >= MAX_RETRIES) {
          conn.state = "closed";
          return reject(
            `${messages.disconnected()}: max retries exceeded (${MAX_RETRIES})`
          );
        }
        return connect(resolve, reject);
      };

      const timer = setTimeout(() => {
        handleError(-1, "timeout");
      }, WEBSOCKET_TIMEOUT);

      ws.addEventListener("open", () => {
        clearTimeout(timer);
        console.debug(`[LSP-Client] WebSocket open`);
        if (conn.state === "ready" || conn.state === "closed") {
          return;
        }
        conn.state = "ready";
        conn.retries = 0;
        useHeartbeat(ws);
        resolve(ws);
      });

      ws.addEventListener("close", (e) => {
        clearTimeout(timer);
        handleError(e.code, e.reason);
      });
    });
  };

  const promise = new Promise<WebSocket>(connect);
  conn.ws = promise;
  return promise;
};

const createLanguageClient = async (): Promise<MonacoLanguageClient> => {
  const ws = await connectWebSocket();
  const socket = toSocket(ws);
  const reader = new WebSocketMessageReader(socket);
  const writer = new WebSocketMessageWriter(socket);

  const client = new MonacoLanguageClient({
    name: "Bytebase Language Client",
    clientOptions: {
      documentSelector: ["sql"],
      initializationOptions: {
        performanceMode: true,
        diagnosticDelay: 500,
        disableFeaturesWhileTyping: true,
      },
      middleware: {
        provideHover: throttle(async (document, position, token, next) => {
          return next(document, position, token);
        }, 300),
        provideCompletionItem: throttle(
          async (document, position, context, token, next) => {
            const triggerCharacters = [".", ",", "(", " "];
            if (
              context.triggerKind === 1 &&
              !triggerCharacters.includes(context.triggerCharacter || "")
            ) {
              return { items: [] };
            }
            return next(document, position, context, token);
          },
          200
        ),
      },
      errorHandler: {
        error: (error, message, count) => {
          console.debug("[MonacoLanguageClient] error", error, message, count);
          return { action: ErrorAction.Continue };
        },
        closed: async () => {
          console.debug("[MonacoLanguageClient] closed");
          conn.ws = undefined;
          try {
            await connectWebSocket();
            return { action: CloseAction.Restart };
          } catch (err) {
            errorNotification(err);
            return { action: CloseAction.DoNotRestart };
          }
        },
      },
    },
    messageTransports: {
      reader,
      writer,
    },
  });

  return client;
};

const useHeartbeat = (ws: WebSocket) => {
  const cleanup = () => {
    clearTimeout(conn.heartbeat.timer);
    conn.heartbeat = {
      timer: undefined,
      counter: 0,
      timestamp: 0,
    };
  };

  ws.addEventListener("error", cleanup);
  ws.addEventListener("close", cleanup);

  const ping = () => {
    conn.heartbeat.counter++;
    conn.heartbeat.timestamp = Date.now();
    ws.send(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "$ping",
        params: {
          state: omit(conn.heartbeat, "timer"),
        },
      })
    );
    conn.heartbeat.timer = setTimeout(ping, WEBSOCKET_HEARTBEAT_INTERVAL);
  };

  ping();
};
```

### 2. Auto-Complete Integration

```typescript
// frontend/src/components/MonacoEditor/composables/useAutoComplete.ts
export const useAutoComplete = async (
  monaco: MonacoModule,
  editor: monaco.editor.IStandaloneCodeEditor,
  context: Ref<AutoCompleteContext | undefined>,
  readonly: Ref<boolean | undefined>
) => {
  const params = computed(() => {
    const p: SetMetadataParams = {
      instanceId: "",
      databaseName: "",
      scene: context.value?.scene,
    };
    const ctx = context.value;
    if (ctx) {
      const instance = extractInstanceResourceName(ctx.instance);
      if (instance && instance !== String(UNKNOWN_ID)) {
        p.instanceId = ctx.instance;
      }
      const { databaseName } = extractDatabaseResourceName(ctx.database ?? "");
      if (databaseName && databaseName !== String(UNKNOWN_ID)) {
        p.databaseName = databaseName;
      }
      if (ctx.schema !== undefined) {
        p.schema = ctx.schema;
      }
    }
    return p;
  });

  // Debounce LSP metadata updates
  const debouncedSetMetadata = debounce(async (params: SetMetadataParams) => {
    if (readonly.value) {
      return;
    }

    try {
      const { executeCommand, initializeLSPClient } = await import(
        "../lsp-client"
      );
      const client = await initializeLSPClient();
      const result = await executeCommand(client, "setMetadata", [params]);
      console.debug(
        `[MonacoEditor] setMetadata(${JSON.stringify(params)}): ${JSON.stringify(result)}`
      );
    } catch (err) {
      console.error("[MonacoEditor] Failed to initialize LSP client", err);
    }
  }, 500);

  watch(
    [() => JSON.stringify(params.value), () => readonly.value],
    () => {
      debouncedSetMetadata(params.value);
    },
    { immediate: true }
  );
};
```

---

## Auto-Completion

### Backend Completion Handler

```go
// backend/api/lsp/completion.go
func (h *Handler) handleTextDocumentCompletion(
    ctx context.Context,
    _ *jsonrpc2.Conn,
    _ *jsonrpc2.Request,
    params lsp.CompletionParams,
) (*lsp.CompletionList, error) {
    if !IsURI(params.TextDocument.URI) {
        return nil, &jsonrpc2.Error{
            Code:    jsonrpc2.CodeInvalidParams,
            Message: fmt.Sprintf("textDocument/completion not yet supported for out-of-workspace URI (%q)", params.TextDocument.URI),
        }
    }

    content, err := h.readFile(ctx, params.TextDocument.URI)
    if err != nil {
        return nil, err
    }

    if len(content) > contentLengthLimit {
        return newEmptyCompletionList(), nil
    }

    _, err = offsetForPosition(content, params.Position)
    if err != nil {
        return nil, errors.Wrapf(err, "invalid position %d:%d", params.Position.Line, params.Position.Character)
    }

    defaultDatabase := h.getDefaultDatabase()
    engine := h.getEngineType(ctx)
    if !common.EngineSupportAutoComplete(engine) {
        return newEmptyCompletionList(), nil
    }

    candidates, err := parserbase.Completion(ctx, engine, parserbase.CompletionContext{
        Scene:             h.getScene(),
        InstanceID:        h.getInstanceID(),
        DefaultDatabase:   defaultDatabase,
        DefaultSchema:     h.getDefaultSchema(),
        Metadata:          h.GetDatabaseMetadataFunc,
        ListDatabaseNames: h.ListDatabaseNamesFunc,
    }, string(content), int(params.Position.Line)+1, int(params.Position.Character))

    if err != nil {
        slog.Error("Failed to get completion candidates", "err", err)
        return newEmptyCompletionList(), nil
    }

    items := []lsp.CompletionItem{}
    for _, candidate := range candidates {
        label := candidate.Text
        // Remove quotes or brackets from label
        if len(label) > 1 && (label[0] == '"' && label[len(label)-1] == '"' || label[0] == '`' && label[len(label)-1] == '`') {
            label = label[1 : len(label)-1]
            label = strings.ReplaceAll(label, `""`, `"`)
        }

        completionItem := lsp.CompletionItem{
            Label: label,
            LabelDetails: &lsp.CompletionItemLabelDetails{
                Detail:      fmt.Sprintf("(%s)", string(candidate.Type)),
                Description: candidate.Definition,
            },
            Kind: convertLSPCompletionItemKind(candidate.Type),
            Documentation: &lsp.Or_CompletionItem_documentation{
                Value: candidate.Comment,
            },
            SortText:   generateSortText(params, engine, candidate),
            InsertText: candidate.Text,
        }
        items = append(items, completionItem)
    }

    return &lsp.CompletionList{
        IsIncomplete: false,
        Items:        items,
    }, nil
}
```

---

## Performance Optimizations

### 1. Debounced Diagnostics

```go
// backend/api/lsp/performance_optimizer.go
type DiagnosticsDebouncer struct {
    mu                 sync.Mutex
    pendingDiagnostics map[lsp.DocumentURI]*pendingDiagnostic
    defaultDelay       time.Duration
}

func (d *DiagnosticsDebouncer) ScheduleDiagnostics(
    ctx context.Context,
    conn *jsonrpc2.Conn,
    uri lsp.DocumentURI,
    content string,
    handler *Handler,
) {
    d.mu.Lock()
    defer d.mu.Unlock()

    // Cancel existing pending diagnostic for this URI
    if existing, exists := d.pendingDiagnostics[uri]; exists {
        existing.cancelled = true
        if existing.timer != nil {
            existing.timer.Stop()
        }
    }

    // Create new pending diagnostic
    pending := &pendingDiagnostic{
        uri:       uri,
        content:   content,
        cancelled: false,
    }

    // Schedule the diagnostic
    pending.timer = time.AfterFunc(d.defaultDelay, func() {
        d.mu.Lock()
        defer d.mu.Unlock()

        if pending.cancelled {
            return
        }

        delete(d.pendingDiagnostics, uri)
        go d.runDiagnostics(ctx, conn, uri, content, handler)
    })

    d.pendingDiagnostics[uri] = pending
}
```

### 2. Content Caching

```go
type ContentCache struct {
    mu         sync.RWMutex
    cache      map[string]*CachedContent
    maxEntries int
    order      []string // Track order for LRU eviction
}

type CachedContent struct {
    Content         string
    LastModified    time.Time
    StatementRanges []lsp.Range
}

func (c *ContentCache) Set(uri string, content *CachedContent) {
    c.mu.Lock()
    defer c.mu.Unlock()

    // Check if already exists
    if _, exists := c.cache[uri]; exists {
        // Move to end (most recently used)
        for i, u := range c.order {
            if u == uri {
                copy(c.order[i:], c.order[i+1:])
                c.order = c.order[:len(c.order)-1]
                break
            }
        }
    }

    // Add to end
    c.order = append(c.order, uri)

    // Evict oldest if over capacity
    if len(c.order) > c.maxEntries {
        oldest := c.order[0]
        delete(c.cache, oldest)
        c.order = c.order[1:]
    }

    c.cache[uri] = content
}
```

### 3. Frontend Optimizations

```typescript
// Debounced content updates
const debouncedUpdate = debounce(() => {
  content.value = getContent(editor);
}, 50);

// Throttled selection updates
const throttledSelectionHandler = throttle(
  ([newSelection, newActiveRangeByCursor]) => {
    emit("update:selection", newSelection);
    // ... process active content
  },
  100,
  { leading: true, trailing: true }
);

// Debounced LSP metadata updates
const debouncedSetMetadata = debounce(async (params: SetMetadataParams) => {
  // ... update metadata
}, 500);
```

### 4. Connection State Management

```typescript
// Connection state indicator
const connectionStateIndicatorClass = computed(() => {
  const state = connectionState.value;
  if (state === "ready") {
    return "bg-green-500";
  }
  if (state === "initial" || state === "reconnecting") {
    return "bg-yellow-500";
  }
  return "bg-gray-500";
});
```

---

## Best Practices

### 1. Error Handling

- همیشه WebSocket errors را handle کنید
- از retry mechanism با exponential backoff استفاده کنید
- Token expiry را check کنید

### 2. Performance

- از debouncing برای frequent updates استفاده کنید
- Content caching برای expensive operations
- Lazy loading برای Monaco Editor
- Throttle کردن completion requests

### 3. Memory Management

- Text models را dispose کنید وقتی دیگر استفاده نمی‌شوند
- Decorations را clear کنید
- Event listeners را cleanup کنید

### 4. Security

- Authentication قبل از WebSocket upgrade
- RBAC checks برای metadata access
- Token validation

### 5. User Experience

- Connection state indicator نمایش دهید
- Loading states برای async operations
- Error messages واضح
- Heartbeat mechanism برای connection health

---

## خلاصه

این implementation شامل:

1. **Frontend**: Monaco Editor با lazy loading، LSP client، composables برای مدیریت state
2. **Backend**: LSP server با WebSocket، authentication، completion provider، diagnostics
3. **Performance**: Debouncing، caching، throttling
4. **Security**: Authentication، RBAC checks
5. **UX**: Connection state indicators، error handling

تمام این موارد برای یک SQL editor با auto-completion و diagnostics کارآمد لازم است.

