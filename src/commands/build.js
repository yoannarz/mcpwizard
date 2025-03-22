import ora from "ora";
import chalk from "chalk";
import { exec } from "child_process";
import util from "util";
import fs from "fs-extra";
import path from "path";
import { globby } from "globby";
import { detectProjectType } from "../utils/project-detector.js";

const execPromise = util.promisify(exec);

/**
 * Prepare the MCP server for deployment
 */
export async function buildCommand() {
  console.log(chalk.blue("🔨 Preparing the MCP server for deployment"));

  // Detection of the project type
  const projectType = await detectProjectType();
  if (!projectType) {
    console.error(
      chalk.red("No MCP project detected in the current directory.")
    );
    process.exit(1);
  }

  let spinner = ora("Building the project...").start();

  try {
    // Detect MCP capabilities based on project structure
    spinner.text = "Detecting MCP capabilities...";
    const capabilities = await detectCapabilities(projectType);
    spinner.succeed(
      `Detected capabilities: ${Object.keys(capabilities).join(", ")}`
    );

    // Update main files with detected capabilities
    spinner = ora("Updating server configuration...").start();
    await updateCapabilitiesConfig(projectType, capabilities);
    spinner.succeed("Server configuration updated");

    spinner = ora("Building the project...").start();

    if (projectType === "typescript") {
      // Check if dependencies are installed
      spinner.text = "Checking dependencies...";
      if (!(await checkNodeModules())) {
        spinner.info("Installing dependencies...");
        await execPromise("npm install");
      }

      // Build the TypeScript project
      spinner.text = "Compiling TypeScript...";
      await execPromise("npm run build");
    } else if (projectType === "python") {
      // Check the Python environment
      spinner.text = "Checking the Python environment...";
      try {
        await execPromise("pip show mcp");
      } catch (err) {
        spinner.info("Installing Python dependencies...");
        await execPromise("pip install -r requirements.txt");
      }

      // For Python, no specific compilation is needed
      spinner.text = "Checking Python syntax...";
      await execPromise("python -m py_compile server.py");
    }

    spinner.succeed(`Build ${chalk.green("successful")}!`);

    // Display information on the next step
    console.log("\nThe server is ready for deployment.");
    console.log("To run the server locally:");

    if (projectType === "typescript") {
      console.log(chalk.cyan("  npm run start"));
    } else {
      console.log(chalk.cyan("  python server.py"));
    }

    console.log("\nTo deploy the server (coming soon):");
    console.log(chalk.cyan("  mcpwizard deploy"));
  } catch (err) {
    spinner.fail("Build failed");
    console.error(chalk.red(`Error: ${err.message}`));
    process.exit(1);
  }
}

/**
 * Detect MCP capabilities based on project structure
 */
async function detectCapabilities(projectType) {
  const capabilities = {};
  const cwd = process.cwd();

  // Check for tools
  if (projectType === "typescript") {
    const hasTools =
      (await fs.pathExists(path.join(cwd, "src/tools"))) &&
      (await globby("src/tools/**/*.ts", { cwd })).length > 0;
    if (hasTools) capabilities.tools = {};

    const hasResources =
      (await fs.pathExists(path.join(cwd, "src/resources"))) &&
      (await globby("src/resources/**/*.ts", { cwd })).length > 0;
    if (hasResources) capabilities.resources = { list: {} };

    const hasPrompts =
      (await fs.pathExists(path.join(cwd, "src/prompts"))) &&
      (await globby("src/prompts/**/*.ts", { cwd })).length > 0;
    if (hasPrompts) capabilities.prompts = {};
  } else if (projectType === "python") {
    const hasTools =
      (await fs.pathExists(path.join(cwd, "tools"))) &&
      (await globby("tools/**/*.py", { cwd })).length > 0;
    if (hasTools) capabilities.tools = {};

    const hasResources =
      (await fs.pathExists(path.join(cwd, "resources"))) &&
      (await globby("resources/**/*.py", { cwd })).length > 0;
    if (hasResources) capabilities.resources = { list: {} };

    const hasPrompts =
      (await fs.pathExists(path.join(cwd, "prompts"))) &&
      (await globby("prompts/**/*.py", { cwd })).length > 0;
    if (hasPrompts) capabilities.prompts = {};
  }

  // Always add logging capability as a best practice
  capabilities.logging = {};

  return capabilities;
}

/**
 * Update server configuration with detected capabilities
 */
async function updateCapabilitiesConfig(projectType, capabilities) {
  const cwd = process.cwd();

  if (projectType === "typescript") {
    const indexPath = path.join(cwd, "src/index.ts");
    if (await fs.pathExists(indexPath)) {
      let content = await fs.readFile(indexPath, "utf8");
      
      // Check if capabilities are already defined
      if (!content.includes("capabilities:")) {
        // Find the server creation code, capturing the closing parenthesis
        const serverCreationRegex = /(const\s+server\s*=\s*new\s+McpServer\(\s*{\s*name:[^}]*}\s*\))/;
        const match = content.match(serverCreationRegex);
        
        if (match) {
          // Remove the closing parenthesis from the matched string
          let serverCreationWithoutClosingParen = match[1].slice(0, -1);
          
          // Format capabilities as a proper second argument to the constructor
          let capabilitiesStr = ", {\n  capabilities: {";
          
          // Add individual capabilities
          if (capabilities.tools) capabilitiesStr += "\n    tools: {},";
          if (capabilities.resources) capabilitiesStr += "\n    resources: { list: {} },";
          if (capabilities.prompts) capabilitiesStr += "\n    prompts: {},";
          if (capabilities.logging) capabilitiesStr += "\n    logging: {},";
          
          // Remove trailing comma if it exists
          if (capabilitiesStr.endsWith(',')) {
            capabilitiesStr = capabilitiesStr.slice(0, -1);
          }
          
          capabilitiesStr += "\n  }\n}";
          
          // Replace with proper construction with closing parenthesis at the end
          const serverWithCapabilities = serverCreationWithoutClosingParen + capabilitiesStr + ");";
          content = content.replace(match[0], serverWithCapabilities);
          await fs.writeFile(indexPath, content, "utf8");
        }
      }
    }
  } else if (projectType === "python") {
    // Python implementation remains unchanged
    const serverPath = path.join(cwd, "server.py");
    if (await fs.pathExists(serverPath)) {
      let content = await fs.readFile(serverPath, "utf8");

      // Check if capabilities are already defined
      if (!content.includes("capabilities=")) {
        // Find the server creation code
        const serverCreationRegex = /mcp\s*=\s*FastMCP\(\s*["'][\w-]+["']\s*\)/;
        const match = content.match(serverCreationRegex);

        if (match) {
          // Convert capabilities to Python dict format
          let capabilitiesStr = "capabilities={\n";
          if (capabilities.tools) capabilitiesStr += '    "tools": {},\n';
          if (capabilities.resources)
            capabilitiesStr += '    "resources": {"list": {}},\n';
          if (capabilities.prompts) capabilitiesStr += '    "prompts": {},\n';
          if (capabilities.logging) capabilitiesStr += '    "logging": {},\n';
          capabilitiesStr += "}";

          // Extract server name from original initialization
          const serverNameMatch = match[0].match(/["']([\w-]+)["']/);
          const serverName = serverNameMatch
            ? serverNameMatch[1]
            : "example-server";

          const serverWithCapabilities = `mcp = FastMCP("${serverName}", ${capabilitiesStr})`;
          content = content.replace(match[0], serverWithCapabilities);
          await fs.writeFile(serverPath, content, "utf8");
        }
      }
    }
  }
}
/**
 * Check if Node modules are installed
 */
async function checkNodeModules() {
  try {
    const stats = await fs.stat("node_modules");
    return stats.isDirectory();
  } catch (err) {
    return false;
  }
}
