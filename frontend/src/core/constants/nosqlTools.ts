import locales from '@/locales';

/** Display names for tool ids declared by a container (`ContainerSpec.tools`). */
export const TOOL_TITLES: Record<string, string> = {
  pubsub: locales.nosql_tool_pubsub,
  cli: locales.nosql_tool_cli,
  server: locales.nosql_tool_server
};
