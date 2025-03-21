import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import os from "os";
import { globby } from "globby";

/**
 * Generate Claude Desktop configuration file for MCP servers
 */
export async function generateClaudeDesktopConfigCommand(options) {
  console.log(chalk.blue("🔧 Generating Claude Desktop configuration file"));

  // Default config path if not specified
  if (!options.output) {
    options.output = getDefaultConfigPath();
  }

  // Define servers configuration
  let servers = [];

  // If servers are specified in command line
  if (options.servers && options.servers.length > 0) {
    servers = options.servers;
  } else {
    // Otherwise, ask user to add servers interactively
    servers = await promptForServers();
  }

  // Generate the config file
  const configObj = { mcpServers: {} };

  for (const serverInfo of servers) {
    // Parse server information
    let serverName, serverPath, serverType;

    if (typeof serverInfo === "string" && serverInfo.includes(":")) {
      [serverName, serverPath, serverType] = serverInfo.split(":");
    } else {
      serverName = serverInfo;
      const serverDetails = await promptForServerDetails(serverName);
      serverPath = serverDetails.path;
      serverType = serverDetails.type;
    }

    // Si c'est un serveur local, demander les variables d'environnement
    let envVars = {};
    if (serverType === "node" || serverType === "python") {
      // Extraire le chemin du répertoire du projet
      let projectDir = path.dirname(serverPath);

      // Si le chemin contient /build/, remonter d'un niveau
      if (projectDir.includes("/build") || projectDir.includes("\\build")) {
        projectDir = path.dirname(projectDir);
      }

      envVars = await promptForEnvVariables(projectDir);
    }

    // Add server to config with environment variables
    configObj.mcpServers[serverName] = createServerConfig(
      serverPath,
      serverType,
      envVars
    );
  }

  // Write config file
  const spinner = ora(`Writing configuration to ${options.output}`).start();

  try {
    // Check if the file already exists
    const configExists = await fs.pathExists(options.output);

    // If it exists, confirm before overwriting
    if (configExists) {
      spinner.stop();

      const existingConfig = await fs.readJson(options.output);
      const existingServers = Object.keys(existingConfig.mcpServers || {});

      if (existingServers.length > 0) {
        console.log(
          chalk.yellow(
            `\nWarning: The file ${options.output} already exists and contains ${existingServers.length} server(s):`
          )
        );
        existingServers.forEach((server) =>
          console.log(chalk.yellow(`  - ${server}`))
        );

        const { confirmOverwrite } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmOverwrite",
            message: "Do you want to overwrite this configuration file?",
            default: false,
          },
        ]);

        if (!confirmOverwrite) {
          console.log(chalk.blue("Operation cancelled. No changes were made."));
          return;
        }

        spinner.start(`Writing configuration to ${options.output}`);
      }
    }
    // Ensure directory exists
    await fs.ensureDir(path.dirname(options.output));

    // Write JSON file
    await fs.writeJson(options.output, configObj, { spaces: 2 });

    // Vérifie si les fichiers cibles existent
    let buildReminder = false;
    let missingFiles = [];

    for (const serverName in configObj.mcpServers) {
      const serverConfig = configObj.mcpServers[serverName];

      // Si c'est un serveur Node, vérifier si le fichier cible existe
      if (serverConfig.command === "node") {
        const targetFile = serverConfig.args[0];
        if (!fs.existsSync(targetFile)) {
          buildReminder = true;
          missingFiles.push(targetFile);
        }
      }
    }

    spinner.succeed(
      `Configuration file generated at ${chalk.green(options.output)}`
    );

    // Afficher des avertissements pour les fichiers manquants
    if (missingFiles.length > 0) {
      console.log(
        chalk.yellow("\nWarning: The following target files do not exist:")
      );
      missingFiles.forEach((file) => {
        console.log(chalk.yellow(`  - ${file}`));
      });
      console.log(
        chalk.yellow(
          "Make sure to build your project before using it with Claude Desktop."
        )
      );
    }

    console.log("\nTo use this configuration:");
    if (buildReminder) {
      console.log(`1. ${chalk.bold("Build your MCP server project")}:`);
      console.log(
        `   - For TypeScript projects: ${chalk.cyan("npm run build")}`
      );
      console.log(
        `   - For Python projects: ensure ${chalk.cyan(
          "server.py"
        )} exists and dependencies are installed (${chalk.cyan(
          "pip install -r requirements.txt"
        )})`
      );
      console.log(`2. Make sure Claude Desktop is installed`);
      console.log(`3. Restart Claude Desktop`);
      console.log(`4. Your configured MCP servers should now be available!`);
    } else {
      console.log(`1. Make sure Claude Desktop is installed`);
      console.log(`2. Restart Claude Desktop`);
      console.log(`3. Your configured MCP servers should now be available!`);
    }
  } catch (err) {
    spinner.fail("Failed to write configuration file");
    console.error(chalk.red(`Error: ${err.message}`));
    process.exit(1);
  }
}

/**
 * Prompt user to add servers interactively
 */
async function promptForServers() {
  const servers = [];
  let addMore = true;

  while (addMore) {
    const { serverName } = await inquirer.prompt([
      {
        type: "input",
        name: "serverName",
        message: 'Server name (e.g. "weather", "filesystem"):',
        validate: (input) =>
          input.trim() !== "" ? true : "Server name cannot be empty",
      },
    ]);

    const serverDetails = await promptForServerDetails(serverName);

    servers.push(`${serverName}:${serverDetails.path}:${serverDetails.type}`);

    const { continue: shouldContinue } = await inquirer.prompt([
      {
        type: "confirm",
        name: "continue",
        message: "Add another server?",
        default: false,
      },
    ]);

    addMore = shouldContinue;
  }

  return servers;
}

/**
 * Prompt for server details
 */
async function promptForServerDetails(serverName) {
  const { serverType } = await inquirer.prompt([
    {
      type: "list",
      name: "serverType",
      message: "Server type:",
      choices: [
        { name: "Local MCP Server (JavaScript/TypeScript)", value: "node" },
        { name: "Local MCP Server (Python)", value: "python" },
        { name: "NPM Package", value: "npm" },
      ],
    },
  ]);

  let serverPath;

  if (serverType === "node") {
    const { path: nodePath } = await inquirer.prompt([
      {
        type: "input",
        name: "path",
        message: "Path to JavaScript/TypeScript server file:",
        default: process.cwd() + "/build/index.js",
      },
    ]);
    serverPath = nodePath;
  } else if (serverType === "python") {
    const { path: pythonPath } = await inquirer.prompt([
      {
        type: "input",
        name: "path",
        message: "Path to Python server file:",
        default: process.cwd() + "/server.py",
      },
    ]);
    serverPath = pythonPath;
  } else if (serverType === "npm") {
    const { packageName } = await inquirer.prompt([
      {
        type: "input",
        name: "packageName",
        message: "NPM package name:",
        default: `@modelcontextprotocol/server-${serverName}`,
      },
    ]);
    serverPath = packageName;
  }

  return { path: serverPath, type: serverType };
}

/**
 * Detect and prompt for environment variables
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

/**
 * Create server configuration based on type and path
 */
function createServerConfig(serverPath, serverType, envVars = {}) {
  const config = {
    command: "",
    args: [],
  };

  switch (serverType) {
    case "node":
      config.command = "node";
      config.args = [serverPath];
      break;
    case "python":
      config.command = process.platform === "win32" ? "python" : "python3";
      config.args = [serverPath];
      break;
    case "npm":
      config.command = "npx";
      config.args = ["-y", serverPath];
      break;
    default:
      throw new Error(`Unknown server type: ${serverType}`);
  }

  // Ajouter les variables d'environnement si présentes
  if (Object.keys(envVars).length > 0) {
    config.env = envVars;
  }

  return config;
}

/**
 * Get default Claude Desktop config path
 */
export function getDefaultConfigPath() {
  const homeDir = os.homedir();

  if (process.platform === "darwin") {
    // macOS
    return path.join(
      homeDir,
      "Library/Application Support/Claude/claude_desktop_config.json"
    );
  } else if (process.platform === "win32") {
    // Windows
    return path.join(
      process.env.APPDATA || path.join(homeDir, "AppData/Roaming"),
      "Claude/claude_desktop_config.json"
    );
  } else {
    // Linux and others
    return path.join(homeDir, ".config/claude/claude_desktop_config.json");
  }
}
