# Resources Directory

This directory contains all the MCP resources exposed by your server.

## Structure

Each resource collection should be placed in its own file:
```
resources/
├── __init__.py
├── my_documents.py
├── my_images.py
└── datasets.py
```

## Adding New Resources

You can manually create a new resource file following the pattern shown below.

## Resource Implementation

Each resource file should define a registration function that accepts the MCP server instance:

```python
from mcp.server.fastmcp import FastMCP
import base64

def register_my_resources(mcp: FastMCP):
    """Registers resources with the MCP server."""
    
    # Text resource example
    mcp.resource('documentation', {
        "type": "text",
        "text": """
        # API Documentation
        
        This is an example of a text resource that can be provided to the model.
        """
    })
    
    # Image resource example
    with open('path/to/image.png', 'rb') as image_file:
        image_data = base64.b64encode(image_file.read()).decode('utf-8')
        
        mcp.resource('diagram', {
            "type": "image",
            "mimeType": "image/png",
            "data": image_data
        })
```

Don't forget to import and register your resources in the main server.py file:

```python
from resources.my_resources import register_my_resources

# Initialize MCP server
mcp = FastMCP("server-name")

# Register resources
register_my_resources(mcp) 