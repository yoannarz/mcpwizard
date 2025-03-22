import open from 'open';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { randomBytes } from 'crypto';

// Configuration of the authentication service
const CONFIG = {
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'https://auth.mcpwizard.co',
  CONFIG_DIR: path.join(os.homedir(), '.mcpwizard'),
  AUTH_FILE: path.join(os.homedir(), '.mcpwizard', 'auth.json'),
};

export async function loginCommand() {
  console.log(chalk.blue('🔑 Connect to MCPWizard'));
  
  // Check if the user is already logged in
  if (await isLoggedIn()) {
    console.log(chalk.green('✅ You are already logged in!'));
    return true;
  }
  
  // Generate a random state for security
  const state = randomBytes(16).toString('hex');
  
  // Initialize the spinner
  const spinner = ora('Initializing authentication...').start();
  
  try {
    // Production approach: use a pre-registered callback
    const callbackUrl = `${CONFIG.AUTH_SERVICE_URL}/auth-cli-callback`;
    
    // Register the callback URL with the authentication server
    const initResponse = await fetch(`${CONFIG.AUTH_SERVICE_URL}/api/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        state,
        callback_url: callbackUrl
      })
    });
    
    if (!initResponse.ok) {
      throw new Error(`Failed to initialize authentication: ${initResponse.statusText}`);
    }
    
    // Verify that registration was successful
    const initData = await initResponse.json();
    if (!initData.success) {
      throw new Error('Failed to initialize authentication');
    }
    
    // Update spinner status
    spinner.info(chalk.cyan('Authentication initialized, opening browser...'));
    
    // Open the browser for authentication
    const authUrl = `${CONFIG.AUTH_SERVICE_URL}/login?state=${state}`;
    
    try {
      await open(authUrl);
      spinner.info(chalk.yellow('Browser opened, please complete the authentication...'));
    } catch {
      // Ignorer l'erreur d'ouverture du navigateur
      spinner.info(chalk.yellow(`Unable to open browser automatically. Please open this URL manually:\n${authUrl}`));
    }
    
    // Production: Poll for authentication completion
    const token = await pollForAuthentication(state, spinner);
    
    // Verify the token with the API
    spinner.text = 'Verifying authentication...';
    
    const tokenResponse = await fetch(`${CONFIG.AUTH_SERVICE_URL}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.valid) {
      throw new Error('Invalid token');
    }
    
    // Save the token in the configuration file
    await fs.ensureDir(CONFIG.CONFIG_DIR);
    await fs.writeJson(CONFIG.AUTH_FILE, { 
      token, 
      timestamp: Date.now(),
      user: tokenData.user || { email: 'user@example.com' } // Fallback if no user data
    });
    
    spinner.succeed(chalk.green('✅ Authentication successful!'));
    
    // Show welcome message with user email if available
    if (tokenData.user && tokenData.user.email) {
      console.log(chalk.blue(`Welcome, ${tokenData.user.email}!`));
    }
    
    return true;
  } catch (error) {
    spinner.fail(chalk.red(`❌ Authentication failed: ${error.message}`));
    return false;
  }
}

// Helper function to poll for authentication (production mode)
async function pollForAuthentication(state, spinner) {
  const maxAttempts = 60; // 5 minutes total (5s intervals)
  const interval = 5000; // 5 seconds between polls
  
  spinner.text = 'Waiting for authentication in browser...';
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Wait for the specified interval
    await new Promise(resolve => setTimeout(resolve, interval));
    
    try {
      // Check if the authentication is complete
      const response = await fetch(`${CONFIG.AUTH_SERVICE_URL}/api/auth/check-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      });
      
      const data = await response.json();
      
      if (data.authenticated && data.token) {
        spinner.text = 'Authentication completed!';
        return data.token;
      }
      
      // Update spinner with attempt count
      spinner.text = `Waiting for authentication... (${attempt + 1}/${maxAttempts})`;
    } catch {
      // Continue polling even if an attempt fails
      console.error('Polling error');
    }
  }
  
  throw new Error('Authentication timed out. Please try again.');
}

// Check if the user is logged in
export async function isLoggedIn() {
  try {
    if (!fs.existsSync(CONFIG.AUTH_FILE)) return false;
    
    const authData = await fs.readJson(CONFIG.AUTH_FILE);
    if (!authData.token) return false;
    
    // Check if the token is valid with the API
    const response = await fetch(`${CONFIG.AUTH_SERVICE_URL}/api/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: authData.token })
    });
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return data.valid === true;
  } catch {
    return false;
  }
}

// Get the authentication token
export async function getAuthToken() {
  try {
    if (!fs.existsSync(CONFIG.AUTH_FILE)) return null;
    
    const authData = await fs.readJson(CONFIG.AUTH_FILE);
    return authData.token || null;
  } catch {
    return null;
  }
} 