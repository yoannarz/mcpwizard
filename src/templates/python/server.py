from mcp.server.fastmcp import FastMCP

# Initialisation du serveur MCP
mcp = FastMCP("example-server")

# Note: Server capabilities will be automatically detected and configured during build
# Tools will be added automatically here
# run mcpwizard tool add my_first_tool to add your first tool

if __name__ == "__main__":
    print("🚀 Starting the MCP server...")
    
    # MCP Server transport
    # For local development and testing, use STDIO transport
    # When you run 'mcpwizard deploy', the SSE transport will be automatically configured
    mcp.run(transport="stdio")