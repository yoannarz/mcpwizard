#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import { initCommand } from "../src/commands/init.js";
import { addToolCommand } from "../src/commands/add-tool.js";
import { buildCommand } from "../src/commands/build.js";
import { deployCommand } from "../src/commands/deploy.js";
import { inspectCommand } from "../src/commands/inspect.js";
import {
  generateClaudeDesktopConfigCommand,
  getDefaultConfigPath,
} from "../src/commands/generate-claude-config-file.js";
import { loginCommand, isLoggedIn } from "../src/commands/login.js";
import { logoutCommand } from "../src/commands/logout.js";
// Configuration of the version and description
program
  .name("mcpwizard")
  .description("A tool to help you create and deploy MCP servers")
  .version("0.1.0");

// Initialize command
program
  .command("init [name]")
  .description("Initialize a new MCP server project")
  .option(
    "-t, --template <template>",
    "Specify a template (typescript, python)",
    "typescript"
  )
  .action((name, options) => {
    // If name is defined, add it to the options
    if (name) options.name = name;
    initCommand(options);
  });

// Command to login
program
  .command("login")
  .description("Log in to MCPWizard")
  .action(loginCommand);

// Command to logout
program
  .command('logout')
  .description('Log out from MCPWizard')
  .action(() => {
    logoutCommand().then(() => process.exit(0)).catch(() => process.exit(1));
  });

// Command to check login status
program
  .command("status")
  .description("Check your MCPWizard login status")
  .action(async () => {
    if (await isLoggedIn()) {
      console.log(chalk.green("✅ You are logged in to MCPWizard."));
    } else {
      console.log(chalk.yellow("❌ You are not logged in to MCPWizard."));
      console.log("Use " + chalk.cyan("mcpwizard login") + " to authenticate.");
    }
  });

// Command to add a tool
program
  .command("tool")
  .description("Add a new tool to the MCP server")
  .argument("<action>", "Action to perform (add, remove, list)")
  .argument("<name>", "Tool name")
  .option("-d, --description <description>", "Tool description")
  .action((action, name, options) => {
    if (action === "add" && name) {
      addToolCommand(name, options);
    } else {
      console.error(
        chalk.red(`Unknown action or missing name: ${action} ${name || ""}`)
      );
      process.exit(1);
    }
  });

// Command to generate the config file for Claude Desktop
program
  .command("generate-claude-config")
  .description("Generate Claude Desktop configuration file for MCP servers")
  .option("-o, --output <path>", "Output file path", getDefaultConfigPath())
  .option("-s, --servers <servers...>", "Server names to include")
  .action(generateClaudeDesktopConfigCommand);

// Command to build the server
program
  .command("build")
  .description("Prepare the MCP server for deployment")
  .action(buildCommand);

// Command to deploy the server
program
  .command("deploy")
  .description("Deploy the MCP server (coming soon)")
  .action(deployCommand);

// Command to run the MCP inspector
program
  .command("inspect")
  .description("Run the MCP inspector on the server")
  .action(inspectCommand);

// Error handling
program.exitOverride();
try {
  program.parse(process.argv);
} catch (err) {
  console.error(chalk.red(`Error: ${err.message}`));
  process.exit(1);
}

// If no command is provided, display the help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
