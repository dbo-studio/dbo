type McpClientId = 'cursor' | 'claude' | 'copilot';

type McpClientConfig = {
  id: McpClientId;
  labelKey: 'mcp_config_cursor' | 'mcp_config_claude' | 'mcp_config_copilot';
  value: string;
};

function formatConfig(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildMcpClientConfigs(proxyUrl: string, token: string): McpClientConfig[] {
  const authHeader = `Bearer ${token}`;

  return [
    {
      id: 'cursor',
      labelKey: 'mcp_config_cursor',
      value: formatConfig({
        mcpServers: {
          dbo: {
            type: 'http',
            url: proxyUrl,
            headers: { Authorization: authHeader }
          }
        }
      })
    },
    {
      id: 'claude',
      labelKey: 'mcp_config_claude',
      value: formatConfig({
        mcpServers: {
          dbo: {
            command: 'npx',
            args: [
              '-y',
              'mcp-remote',
              proxyUrl,
              '--transport',
              'http-only',
              '--header',
              'Authorization:${DBO_MCP_AUTH}'
            ],
            env: {
              DBO_MCP_AUTH: authHeader
            }
          }
        }
      })
    },
    {
      id: 'copilot',
      labelKey: 'mcp_config_copilot',
      value: formatConfig({
        servers: {
          dbo: {
            type: 'http',
            url: proxyUrl,
            headers: { Authorization: authHeader }
          }
        }
      })
    }
  ];
}

export type { McpClientConfig, McpClientId };
