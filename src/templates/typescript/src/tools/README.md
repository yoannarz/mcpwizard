# Tools Directory

This directory contains all the MCP tools exposed by your server.

## Structure

Each tool should be placed in its own subdirectory:

```
tools/
├── my-first-tool/
│   └── index.ts
├── another-tool/
│   └── index.ts
└── complex-tool/
    ├── index.ts
    └── helper.ts
```

## Adding New Tools

You can add new tools using the MCPWizard CLI:

```bash
mcpwizard tool add my-tool-name
```

Or manually create a new directory and files following the pattern shown above.

## Tool Implementation

Each tool should export a registration function that accepts the MCP server instance:

```typescript
export function registerMyTool(server: McpServer) {
  server.tool(
    "my-tool-name",
    "Description of what the tool does",
    {
      // Tool parameters schema using Zod
      param1: z.string().describe("Description of parameter 1"),
      param2: z.number().describe("Description of parameter 2")
    },
    async ({ param1, param2 }) => {
      // Tool implementation
      return {
        content: [
          {
            type: "text",
            text: "Tool result"
          }
        ]
      };
    }
  );
}
```

Don't forget to import and register your tool in the main index.ts file.