import { getEngineCapabilities } from '@/core/db';
import type { ConnectionType } from '@/types';

/**
 * The database and schema the assistant works in: the ones picked in the chat, else the
 * connection's own database and the engine's usual schema. The composer shows these and
 * every turn sends them, so what the user sees is what the agent gets.
 */
export const contextScope = (
  context: { database?: string; schema?: string },
  connection: ConnectionType | undefined
): { database?: string; schema?: string } => {
  const capabilities = getEngineCapabilities(connection?.type);

  return {
    database:
      context.database || (connection && 'database' in connection.options ? connection.options.database : undefined),
    schema: context.schema ?? (capabilities.hasSchema ? capabilities.preferredSchema : undefined)
  };
};
