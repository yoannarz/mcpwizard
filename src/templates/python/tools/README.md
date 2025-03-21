# Tools Directory

This directory contains all the MCP tools exposed by your server.

## Structure

Each tool should be placed in its own file:
```
tools/
├── init.py
├── my_first_tool.py
├── another_tool.py
└── complex_tool.py
```

## Adding New Tools

You can add new tools using the MCPWizard CLI:

```bash
mcpwizard tool add my-tool-name
```

Or manually create a new file following the pattern shown below.

## Tool Implementation

Each tool file should define a registration function that accepts the MCP server instance:

```python
def register_my_tool(mcp: FastMCP):
    """Registers the my-tool tool with the MCP server."""
    
    @mcp.tool()
    async def my_tool(param1: str, param2: float) -> str:
        """Description of what the tool does
        
        Args:
            param1: Description of parameter 1
            param2: Description of parameter 2
        """
        # Tool implementation
        return f"Tool result with {param1} and {param2}"
```

Don't forget to import and register your tool in the main server.py file:

```python
from tools.my_tool import register_my_tool

# Initialize MCP server
mcp = FastMCP("server-name")

# Register tools
register_my_tool(mcp)
```