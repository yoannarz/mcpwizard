import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

const CONFIG_DIR = path.join(os.homedir(), '.mcpwizard');
const AUTH_FILE = path.join(CONFIG_DIR, 'auth.json');

/**
 * Log out from MCPWizard by removing stored authentication data
 */
export async function logoutCommand() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      await fs.remove(AUTH_FILE);
      console.log(chalk.green('✅ Successfully logged out!'));
      process.exit(0);
      return true;
    } else {
      console.log(chalk.yellow('You are not logged in.'));
      process.exit(0);
      return false;
    }
  } catch (error) {
    console.log(chalk.red(`❌ Logout failed: ${error.message}`));
    process.exit(1);
    return false;
  }
}