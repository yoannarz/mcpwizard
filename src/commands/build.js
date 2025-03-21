import ora from "ora";
import chalk from "chalk";
import { exec } from "child_process";
import util from "util";
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

  const spinner = ora("Building the project...").start();

  try {
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
