# Prompts Directory

This directory contains all the MCP prompts exposed by your server.

## Structure

Each prompt should be placed in its own file:
```
prompts/
├── __init__.py
├── my_first_prompt.py
├── another_prompt.py
└── complex_prompt.py
```

## Adding New Prompts

You can manually create a new prompt file following the pattern shown below.

## Prompt Implementation

Each prompt file should define a registration function that accepts the MCP server instance:

```python
from mcp.server.fastmcp import FastMCP

def register_my_prompt(mcp: FastMCP):
    """Registers the my-prompt prompt with the MCP server."""
    
    mcp.prompt('my_prompt', {
        "model": "claude-3-haiku-20240307",
        "system": "You are a helpful assistant that provides concise responses.",
        "messages": [
            {
                "role": "user",
                "content": "Tell me about the Model Context Protocol."
            },
            {
                "role": "assistant",
                "content": "The Model Context Protocol (MCP) is a standard for building API servers that provide AI models with tools and context."
            }
        ]
    })
```

Don't forget to import and register your prompt in the main server.py file:

```python
from prompts.my_prompt import register_my_prompt

# Initialize MCP server
mcp = FastMCP("server-name")

# Register prompts
register_my_prompt(mcp) 