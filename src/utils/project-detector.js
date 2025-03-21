import fs from 'fs-extra';
import path from 'path';

/**
 * Detects the MCP project type in the current directory
 * @returns {Promise<string|null>} 'typescript', 'python', or null if not detected
 */
export async function detectProjectType() {
  const cwd = process.cwd();
  
  // Check TypeScript files
  if (
    fs.existsSync(path.join(cwd, 'tsconfig.json')) &&
    fs.existsSync(path.join(cwd, 'package.json'))
  ) {
    const pkg = await fs.readJson(path.join(cwd, 'package.json'));
    if (
      (pkg.dependencies && pkg.dependencies['@modelcontextprotocol/sdk']) ||
      (pkg.devDependencies && pkg.devDependencies['@modelcontextprotocol/sdk'])
    ) {
      return 'typescript';
    }
  }
  
  // Check Python files
  if (
    fs.existsSync(path.join(cwd, 'requirements.txt')) ||
    fs.existsSync(path.join(cwd, 'server.py'))
  ) {
    // Check if mcp is listed in requirements.txt or imported in server.py
    try {
      if (fs.existsSync(path.join(cwd, 'requirements.txt'))) {
        const requirements = await fs.readFile(path.join(cwd, 'requirements.txt'), 'utf8');
        if (requirements.includes('mcp') || requirements.includes('mcp>=') || requirements.includes('mcp==')) {
          return 'python';
        }
      }
      
      if (fs.existsSync(path.join(cwd, 'server.py'))) {
        const serverContent = await fs.readFile(path.join(cwd, 'server.py'), 'utf8');
        if (serverContent.includes('import mcp') || serverContent.includes('from mcp')) {
          return 'python';
        }
      }
    } catch (err) {
      // Ignore file reading errors
    }
  }
  
  // Type not detected
  return null;
}