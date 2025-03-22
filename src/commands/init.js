import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import ora from 'ora';
import { fileURLToPath } from 'url';

// Get the current module path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the templates
const templatesDir = path.resolve(__dirname, '../templates');

/**
 * Initialize a new MCP server project
 */
export async function initCommand(options) {
  console.log(chalk.blue('🧙‍♂️ Initialization of a new MCP server'));

  
  // If the project name is not provided or is empty, ask for it
  if (!options.name || options.name.trim() === '') {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Server name:',
        default: 'my-mcp-server'
      }
    ]);
    options.name = answers.name;
  }
  
  // Validation of the project name
  if (!/^[a-z0-9-_]+$/.test(options.name)) {
    console.error(chalk.red('The project name must contain only lowercase letters, numbers, dashes and underscores.'));
    process.exit(1);
  }
  
  // Check if the directory already exists
  const projectDir = path.resolve(process.cwd(), options.name);
  if (fs.existsSync(projectDir)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `The directory ${options.name} already exists. Do you want to overwrite it?`,
        default: false
      }
    ]);
    
    if (!overwrite) {
      console.log(chalk.yellow('Initialization cancelled.'));
      process.exit(0);
    }
    
    fs.removeSync(projectDir);
  }
  
  // Choice of the template
  let template = options.template;
  if (!['typescript', 'python'].includes(template)) {
    const { selectedTemplate } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTemplate',
        message: 'Choose a template:',
        choices: ['typescript', 'python']
      }
    ]);
    template = selectedTemplate;
  }
  
  // Copy of the template
  const spinner = ora('Creating the project...').start();
  try {
    const templatePath = path.join(templatesDir, template);
    await fs.copy(templatePath, projectDir);
    
    // Get a clean server name for the MCP server
    // Remove any special characters except dashes and underscores
    const cleanServerName = options.name.replace(/[^a-z0-9-_]/g, '');
    
    // Personalization of the files based on template
    if (template === 'typescript') {
      // Update package.json
      const pkgPath = path.join(projectDir, 'package.json');
      const pkg = await fs.readJson(pkgPath);
      pkg.name = options.name;
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
      
      // Update index.ts with the correct server name
      const indexPath = path.join(projectDir, 'src/index.ts');
      let indexContent = await fs.readFile(indexPath, 'utf8');
      indexContent = indexContent.replace(
        /name: "example-server"/g, 
        `name: "${cleanServerName}"`
      );
      await fs.writeFile(indexPath, indexContent, 'utf8');
    } else if (template === 'python') {
      // Update server.py with the correct server name
      const serverPath = path.join(projectDir, 'server.py');
      let serverContent = await fs.readFile(serverPath, 'utf8');
      serverContent = serverContent.replace(
        /FastMCP\("example-server"\)/g, 
        `FastMCP("${cleanServerName}")`
      );
      await fs.writeFile(serverPath, serverContent, 'utf8');
    }
    
    spinner.succeed(`Project ${chalk.green(options.name)} created successfully!`);
    
    // Display of the instructions
    console.log('\nTo get started:');
    console.log(chalk.cyan(`  cd ${options.name}`));
    if (template === 'typescript') {
      console.log(chalk.cyan('  npm install'));
      console.log(chalk.cyan('  npm run dev'));
    } else {
      console.log(chalk.cyan('  pip install -r requirements.txt'));
      console.log(chalk.cyan('  python server.py'));
    }
  } catch (err) {
    spinner.fail('Failed to create the project');
    console.error(chalk.red(`Error: ${err.message}`));
    process.exit(1);
  }
}