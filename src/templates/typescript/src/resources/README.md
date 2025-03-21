# Resources Directory

This directory contains all the MCP resources exposed by your server.

## Structure

Each resource should be placed in its own subdirectory:

```
resources/
├── my-first-resource/
│   └── index.ts
└── another-resource/
    ├── index.ts
    └── helper.ts
```

## Adding New Resources

You can add new resources using the MCPWizard CLI:

```bash
mcpwizard resource add my-resource-name
```

Or manually create a new directory and files following the pattern shown above.

## Resource Implementation

Each resource should export a registration function that accepts the MCP server instance:

```typescript
export function registerMyResource(server: McpServer) {
  server.resource(
    "my-resource-name",
    new ResourceTemplate("resource://{param1}/{param2}", { list: undefined }),
    async (uri, { param1, param2 }) => {
      // Resource implementation
      return {
        contents: [{
          uri: uri.href,
          text: `Content for ${param1} and ${param2}`
        }]
      };
    }
  );
}
```

Don't forget to import and register your resource in the main index.ts file.