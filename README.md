# MCPWizard

A CLI tool to help you create and deploy Model Context Protocol (MCP) servers.

## Installation

```bash
npm install -g mcpwizard
```

## Features

- Initialize new MCP server projects
- Add/manage tools for your MCP server
- Build your MCP server for deployment
- Generate Claude Desktop configuration files
- Inspect MCP servers

> **Note:** Currently, MCPWizard only supports tool type in the MCP protocol.

## Roadmap

- Support for MCP resources
- Support for MCP prompts
- Support for MCP transport
- Deployment service integration

## Usage

### Initialize a New Project

```bash
mcpwizard init [name] [options]
```

Options:
- `-t, --template <template>`: Specify a template (typescript, python). Default is "typescript".

### Add a Tool

```bash
mcpwizard tool add <tool-name> [options]
```

Options:
- `-d, --description <description>`: Tool description

### Generate Claude Desktop Configuration

```bash
mcpwizard generate-claude-config [options]
```

Options:
- `-o, --output <path>`: Output file path
- `-s, --servers <servers...>`: Server names to include

### Build Your Server

```bash
mcpwizard build
```

### Deploy Your Server

```bash
mcpwizard deploy
```

### Inspect Your Server

```bash
mcpwizard inspect
```

## Project Structure

When running `mcpwizard init my-mcp-server`, the user gets a new project with the selected template structure:

### TypeScript Template
```
my-mcp-server/
├── src/
│   ├── prompts/     # MCP prompts definitions
│   ├── resources/   # MCP resources definitions
│   └── tools/       # MCP tools implementations
├── .env.template    # Environment variables template
├── package.json     # Dependencies and scripts
└── tsconfig.json    # TypeScript configuration
```

### Python Template
```
my-mcp-server/
├── prompts/         # MCP prompts definitions
├── resources/       # MCP resources definitions
├── tools/           # MCP tools implementations
├── .env.template    # Environment variables template
├── requirements.txt # Python dependencies
└── server.py        # Main server file
```

## Dependencies

- chalk: Terminal string styling
- commander: Command-line interface
- fs-extra: Enhanced file system methods
- globby: Glob matching utilities
- inquirer: Interactive command line interface
- ora: Elegant terminal spinners

## License

MIT

## Contributing

Contributions are welcome! Here's the structure of the mcpwizard package:

```
mcpwizard/
├── bin/              # CLI entry point
│   └── mcpwizard.js  # Main CLI file
├── src/
│   ├── commands/     # CLI command implementations
│   ├── templates/    # Project templates (typescript, python)
│   ├── utils/        # Utility functions 
│   └── validators/   # Input validation logic
├── package.json      # Package configuration
└── README.md         # This file
```
