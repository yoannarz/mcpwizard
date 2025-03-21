import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import ora from "ora";
import { detectProjectType } from "../utils/project-detector.js";

/**
 * Add a new tool to the MCP server
 */
export async function addToolCommand(name, options) {
  console.log(chalk.blue(`🔧 Adding a new tool: ${name}`));

  // Project type detection
  const projectType = await detectProjectType();
  if (!projectType) {
    console.error(
      chalk.red("No MCP project detected in the current directory.")
    );
    process.exit(1);
  }

  // If no description, ask for it
  if (!options.description) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "description",
        message: "Tool description:",
        default: `Tool ${name}`,
      },
    ]);
    options.description = answers.description;
  }

  // Ask for information about the tool parameters
  let params = [];
  let addMoreParams = true;

  while (addMoreParams) {
    const paramAnswers = await inquirer.prompt([
      {
        type: "input",
        name: "paramName",
        message: "Parameter name (leave empty to finish):",
      },
    ]);

    if (!paramAnswers.paramName) {
      addMoreParams = false;
      continue;
    }

    const paramDetails = await inquirer.prompt([
      {
        type: "list",
        name: "paramType",
        message: "Parameter type:",
        choices: ["string", "number", "boolean", "object", "array"],
      },
      {
        type: "input",
        name: "paramDescription",
        message: "Parameter description:",
        default: paramAnswers.paramName,
      },
      {
        type: "confirm",
        name: "paramRequired",
        message: "Is this parameter required?",
        default: true,
      },
    ]);

    params.push({
      name: paramAnswers.paramName,
      type: paramDetails.paramType,
      description: paramDetails.paramDescription,
      required: paramDetails.paramRequired,
    });
  }

  // Add the tool to the project
  const spinner = ora("Adding the tool...").start();

  try {
    if (projectType === "typescript") {
      await addToolToTypeScript(name, options.description, params);
    } else if (projectType === "python") {
      await addToolToPython(name, options.description, params);
    }

    spinner.succeed(`Tool ${chalk.green(name)} added successfully!`);
  } catch (err) {
    spinner.fail("Failed to add the tool");
    console.error(chalk.red(`Error: ${err.message}`));
    process.exit(1);
  }
}

/**
 * Add a tool to a TypeScript project
 */
async function addToolToTypeScript(name, description, params) {
  const cwd = process.cwd();

  // Create the tools directory if it doesn't exist
  const toolsDir = path.join(cwd, "src/tools");
  await fs.ensureDir(toolsDir);

  // Create the specific tool directory
  const toolDir = path.join(toolsDir, name);
  await fs.ensureDir(toolDir);

  // Build the tool code
  const paramSchema = params
    .map((p) => {
      const typeMap = {
        string: "z.string()",
        number: "z.number()",
        boolean: "z.boolean()",
        object: "z.object({})",
        array: "z.array(z.string())",
      };

      let schema = typeMap[p.type];
      if (p.description) {
        schema += `.describe("${p.description}")`;
      }

      return `  ${p.name}: ${schema}${p.required ? "" : ".optional()"}`;
    })
    .join(",\n");

  // Tool index.ts file code
  const toolCode = `import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * ${description}
 */
export function register${capitalizeFirstLetter(name)}(server: McpServer) {
  server.tool(
    "${name}",
    "${description}",
    {
${paramSchema}
    },
    async (${
      params.length > 0
        ? "{ " + params.map((p) => p.name).join(", ") + " }"
        : "_"
    }) => {
      try {
        // Implement your tool logic here
        // For example: Make API calls, process data, etc.
        
        // MCP Response Format:
        // Return an object with a 'content' array containing response items
        // Each item can be:
        //   - { type: "text", text: "Text content" }
        //   - { type: "image", data: "base64-data", mimeType: "image/png" }
        //   - { type: "resource", resource: { uri, text, mimeType } }
        //
        // For errors, add 'isError: true' to the response object
        return {
          content: [
            {
              type: "text",
              text: "Tool ${name} implementation"
            }
          ]
        };
      } catch (error: any) {
        // Using 'any' type to access error.message safely
        console.error(\`Error in ${name} tool: \${error}\`);
        return {
          content: [
            {
              type: "text",
              text: \`Error executing ${name}: \${error?.message || String(error)}\`
            }
          ],
          isError: true
        };
      }
    }
  );
}
`;

  // Write the tool file
  await fs.writeFile(path.join(toolDir, "index.ts"), toolCode, "utf8");

  // Now, update the main index.ts file to import the tool
  const indexPath = path.join(cwd, "src/index.ts");
  if (!fs.existsSync(indexPath)) {
    throw new Error("src/index.ts file not found");
  }

  let indexContent = await fs.readFile(indexPath, "utf8");

  // Check if the import already exists
  const importLine = `import { register${capitalizeFirstLetter(
    name
  )} } from "./tools/${name}/index.js";`;
  if (!indexContent.includes(importLine)) {
    // Add the import after the existing imports
    const lastImportIndex = indexContent.lastIndexOf("import ");
    if (lastImportIndex !== -1) {
      const endOfImportIndex = indexContent.indexOf("\n", lastImportIndex);
      if (endOfImportIndex !== -1) {
        indexContent =
          indexContent.slice(0, endOfImportIndex + 1) +
          importLine +
          "\n" +
          indexContent.slice(endOfImportIndex + 1);
      }
    }
  }

  // Check if the registration already exists
  const registerLine = `register${capitalizeFirstLetter(name)}(server);`;
  if (!indexContent.includes(registerLine)) {
    // Find the "Tool imports" comment
    const toolsCommentIndex = indexContent.indexOf("// Tool imports");
    if (toolsCommentIndex !== -1) {
      // Insert after the comment
      indexContent =
        indexContent.slice(
          0,
          toolsCommentIndex + "// Tool imports".length
        ) +
        "\n" +
        registerLine +
        indexContent.slice(toolsCommentIndex + "// Tool imports".length);
    } else {
      // Fallback: insert before the main function
      const mainIndex = indexContent.indexOf("async function main()");
      if (mainIndex !== -1) {
        indexContent =
          indexContent.slice(0, mainIndex) +
          registerLine +
          "\n\n" +
          indexContent.slice(mainIndex);
      }
    }
  }

  // Write the updated index.ts file
  await fs.writeFile(indexPath, indexContent, "utf8");
}

/**
 * Add a tool to a Python project
 */
async function addToolToPython(name, description, params) {
  const cwd = process.cwd();

  // Create the tools directory if it doesn't exist
  const toolsDir = path.join(cwd, "tools");
  await fs.ensureDir(toolsDir);

  // Create the necessary __init__.py files
  await fs.writeFile(path.join(toolsDir, "__init__.py"), "", "utf8");

  // Build the tool code
  const paramDefs = params
    .map((p) => {
      const typeMap = {
        string: "str",
        number: "float",
        boolean: "bool",
        object: "dict",
        array: "list",
      };

      return `${p.name}: ${typeMap[p.type]}`;
    })
    .join(", ");

  const docstring = `"""${description}

Args:
${params.map((p) => `    ${p.name}: ${p.description}`).join("\n")}
"""`;

  // Tool file code
  const toolCode = `from mcp.server.fastmcp import FastMCP

def register_${snake_case(name)}(mcp: FastMCP):
    """Register the tool ${name} on the MCP server."""
    
    @mcp.tool()
    async def ${snake_case(name)}(${paramDefs}) -> str:
        ${docstring}
        try:
            # Implement your tool logic here
            # For example: Make API calls, process data, etc.
            
            # In Python FastMCP, you can return one of:
            # 1. A simple string - It will be converted to a text content
            # 2. A list of content objects for more complex responses
            # 3. A CallToolResult object for full control
            #
            # Example of advanced response:
            # return [
            #    {"type": "text", "text": "Text content"},
            #    {"type": "image", "data": "base64-data", "mimeType": "image/png"}
            # ]
            
            return f"Tool ${name} implementation"
        except Exception as e:
            print(f"Error in ${name} tool: {str(e)}")
            # To return an error, either:
            # 1. Raise an exception (simple)
            # 2. Return a specialized error response (advanced)
            return f"Error executing ${name}: {str(e)}"
`;

  // Write the tool file
  await fs.writeFile(
    path.join(toolsDir, `${snake_case(name)}.py`),
    toolCode,
    "utf8"
  );

  // Now, update the main server.py file to import the tool
  const serverPath = path.join(cwd, "server.py");
  if (!fs.existsSync(serverPath)) {
    throw new Error("server.py file not found");
  }

  let serverContent = await fs.readFile(serverPath, "utf8");

  // Check if the import already exists
  const importLine = `from tools.${snake_case(
    name
  )} import register_${snake_case(name)}`;
  if (!serverContent.includes(importLine)) {
    // Find the position after the existing imports
    let importEndIndex = 0;
    const lines = serverContent.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("import ") || lines[i].startsWith("from ")) {
        importEndIndex = serverContent.indexOf(lines[i]) + lines[i].length;
      } else if (lines[i].trim() !== "") {
        break;
      }
    }

    // Add the import
    serverContent =
      serverContent.slice(0, importEndIndex) +
      "\n" +
      importLine +
      serverContent.slice(importEndIndex);
  }

  // Check if the registration already exists
  const registerLine = `register_${snake_case(name)}(mcp)`;
  if (!serverContent.includes(registerLine)) {
    // Find the position after the mcp initialization
    const mcpInitIndex = serverContent.indexOf("mcp = FastMCP");
    if (mcpInitIndex !== -1) {
      // Find the end of the initialization
      const initEndIndex = serverContent.indexOf("\n", mcpInitIndex);
      if (initEndIndex !== -1) {
        serverContent =
          serverContent.slice(0, initEndIndex + 1) +
          "\n" +
          registerLine +
          serverContent.slice(initEndIndex + 1);
      }
    }
  }

  // Write the updated server.py file
  await fs.writeFile(serverPath, serverContent, "utf8");
}

/**
 * Utility functions for string manipulation
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function snake_case(string) {
  return string.replace(/-/g, "_");
}
