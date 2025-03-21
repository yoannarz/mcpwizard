# Prompts Directory

This directory contains all the MCP prompts exposed by your server.

## Structure

Each prompt should be placed in its own subdirectory:

```
prompts/
├── my-first-prompt/
│   └── index.ts
└── another-prompt/
    ├── index.ts
    └── helper.ts
```

## Adding New Prompts

You can add new prompts using the MCPWizard CLI:

```bash
mcpwizard prompt add my-prompt-name
```

Or manually create a new directory and files following the pattern shown above.

## Prompt Implementation

Each prompt should export a registration function that accepts the MCP server instance:

```typescript
export function registerMyPrompt(server: McpServer) {
  server.prompt(
    "my-prompt-name",
    {
      param1: z.string().describe("Description of parameter 1"),
      param2: z.number().describe("Description of parameter 2")
    },
    ({ param1, param2 }) => ({
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: `Custom prompt with ${param1} and ${param2}`
        }
      }]
    })
  );
}
```

Don't forget to import and register your prompt in the main index.ts file.