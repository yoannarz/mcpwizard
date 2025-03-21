import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// MPC Server creation
const server = new McpServer({
  name: "example-server",
  version: "1.0.0"
});

// Tools will be added automatically here
// Run mcpwizard tool add my_first_tool to add your first tool

// Server starting
async function main() {
  // MCP Server transport
  // For local development and testing, use STDIO transport
  // When you run 'mcpwizard deploy', the SSE transport will be automatically configured
  const transport = new StdioServerTransport();
  
  try {
    console.error("🚀 Starting the MCP server...");
    await server.connect(transport);
    console.error("✅ MCP server connected and ready");
  } catch (error) {
    console.error("❌ Error starting the server:", error);
    process.exit(1);
  }
}

main();