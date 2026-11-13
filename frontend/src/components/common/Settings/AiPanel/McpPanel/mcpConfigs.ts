type McpClientId = 'claude-code' | 'cursor' | 'claude' | 'copilot';

type McpClientConfig = {
  id: McpClientId;
  labelKey: 'mcp_config_claude_code' | 'mcp_config_cursor' | 'mcp_config_claude' | 'mcp_config_copilot';
  hintKey: 'mcp_hint_claude_code' | 'mcp_hint_cursor' | 'mcp_hint_claude' | 'mcp_hint_copilot';
  lang: 'text' | 'json';
  value: string;
};

function formatConfig(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function buildMcpClientConfigs(proxyUrl: string, token: string): McpClientConfig[] {
  const authHeader = `Bearer ${token}`;

  return [
    {
      id: 'claude-code',
      labelKey: 'mcp_config_claude_code',
      hintKey: 'mcp_hint_claude_code',
      lang: 'text',
      value: `claude mcp add --transport http dbo ${proxyUrl} --header "Authorization: ${authHeader}"`
    },
    {
      id: 'cursor',
      labelKey: 'mcp_config_cursor',
      hintKey: 'mcp_hint_cursor',
      lang: 'json',
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
      hintKey: 'mcp_hint_claude',
      lang: 'json',
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
      hintKey: 'mcp_hint_copilot',
      lang: 'json',
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
