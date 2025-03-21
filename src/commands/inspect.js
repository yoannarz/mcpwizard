import chalk from "chalk";
import { exec, spawn } from "child_process";
import util from "util";
import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import { globby } from "globby";
import { detectProjectType } from "../utils/project-detector.js";

const execPromise = util.promisify(exec);

/**
 * Run the MCP inspector on the server
 */
export async function inspectCommand() {
  console.log(chalk.blue("🔍 Running MCP Inspector"));

  // Detection of the project type
  const projectType = await detectProjectType();
  if (!projectType) {
    console.error(
      chalk.red("No MCP project detected in the current directory.")
    );
    process.exit(1);
  }

  try {
    // Check if MCP Inspector is installed
    try {
      await execPromise("npx --no @modelcontextprotocol/inspector --version");
      console.log(chalk.green("MCP Inspector is already installed"));
    } catch (err) {
      console.log(chalk.yellow("MCP Inspector not found. Installing..."));
      await execPromise("npm install -g @modelcontextprotocol/inspector");
      console.log(chalk.green("MCP Inspector installed successfully"));
    }

    if (projectType === "typescript") {
      // Make sure the project is built
      console.log(chalk.yellow("Ensuring the project is built..."));
      await execPromise("npm run build");
      
      // Detect and configure environment variables
      const projectDir = process.cwd();
      const envVars = await promptForEnvVariables(projectDir);
      
      // Run the inspector with spawn to keep it running
      console.log(chalk.green("Launching MCP Inspector on the built server..."));
      
      // Create command arguments with environment variables passed as -e KEY=VALUE
      const args = ["@modelcontextprotocol/inspector"];
      
      // Add environment variables as -e arguments
      Object.entries(envVars).forEach(([key, value]) => {
        args.push("-e", `${key}=${value}`);
      });
      
      // Add the -- to separate inspector args from server command
      args.push("--");
      
      // Add the server command
      args.push("node", "build/index.js");
      
      // Using spawn to keep the process running
      const inspectorProcess = spawn("npx", args, { 
        stdio: 'pipe',
        detached: false
      });
      
      console.log(chalk.cyan("MCP Inspector should be available at http://localhost:5173"));
      console.log(chalk.yellow("Press Ctrl+C to stop the inspector when you're done"));
      
      // Pipe stdout and stderr to console
      inspectorProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
      });
      
      inspectorProcess.stderr.on('data', (data) => {
        process.stderr.write(data);
      });
      
      // Handle process exit
      inspectorProcess.on('exit', (code) => {
        if (code !== 0) {
          console.error(chalk.red(`Inspector process exited with code ${code}`));
        }
      });
      
      // Keep the process running until user terminates it
      process.on('SIGINT', () => {
        console.log(chalk.yellow("\nStopping MCP Inspector..."));
        
        if (!inspectorProcess.killed) {
          inspectorProcess.kill();
        }
        
        process.exit(0);
      });
      
    } else if (projectType === "python") {
      console.log(chalk.red("MCP Inspector is currently only supported for TypeScript projects"));
      process.exit(1);
    }
  } catch (err) {
    console.error(chalk.red(`Error running MCP Inspector: ${err.message}`));
    process.exit(1);
  }
}

/**
 * Prompt for environment variables from .env files
 */
async function promptForEnvVariables(projectPath) {
  try {
    // Find all .env* files excluding .env (which contains actual values)
    const envFiles = await globby([".env*", "!.env"], {
      cwd: projectPath,
      dot: true,
      onlyFiles: true,
    });

    if (envFiles.length === 0) {
      console.log(
        chalk.yellow(
          "\nNo .env template files found. No environment variables will be configured."
        )
      );
      return {};
    }

    // If multiple .env files exist, let user choose which one to use
    let selectedEnvFile;
    if (envFiles.length === 1) {
      selectedEnvFile = envFiles[0];
    } else {
      const { envFile } = await inquirer.prompt([
        {
          type: "list",
          name: "envFile",
          message:
            "Multiple environment templates found. Which one would you like to use?",
          choices: envFiles,
        },
      ]);
      selectedEnvFile = envFile;
    }

    // Read the selected env file
    const envFilePath = path.join(projectPath, selectedEnvFile);
    const envTemplate = await fs.readFile(envFilePath, "utf8");

    // Parse the template file to extract variable names
    const envVars = {};
    const lines = envTemplate.split("\n");

    console.log(
      chalk.blue(`\nConfiguring environment variables from ${selectedEnvFile}:`)
    );

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith("#") || !line.trim()) continue;

      // Extract variable name and default value
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) {
        const varName = match[1];
        const defaultValue = match[2] || "";

        // Check if this is clearly a template placeholder
        const isPlaceholder =
          defaultValue.includes("your_") ||
          defaultValue.includes("YOUR_") ||
          defaultValue === "" ||
          defaultValue.toLowerCase() === "changeme" ||
          defaultValue.toLowerCase() === "your-api-key";

        // Prompt user for value
        const { value } = await inquirer.prompt([
          {
            type: "input",
            name: "value",
            message: `Enter value for ${chalk.cyan(varName)}:`,
            default: isPlaceholder ? process.env[varName] || "" : defaultValue,
          },
        ]);

        if (value) {
          envVars[varName] = value;
        }
      }
    }

    return envVars;
  } catch (err) {
    console.error(chalk.yellow(`\nError reading env files: ${err.message}`));
    console.log(chalk.yellow("Continuing without environment variables."));
    return {};
  }
} 