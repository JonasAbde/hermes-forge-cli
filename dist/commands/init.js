import { Command } from 'commander';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { printHeader, printSuccess, printError, printInfo, printWarning } from '../lib/output.js';
function errorMessage(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
const TEMPLATES = {
    pack: {
        name: 'Agent Pack',
        description: 'New Agent Pack with metadata and cutouts structure',
        files: {
            'metadata.json': (name) => JSON.stringify({
                id: name,
                name: name.charAt(0).toUpperCase() + name.slice(1),
                version: '1.0.0',
                description: `A new agent pack: ${name}`,
                theme: 'default',
                author: '',
                tags: [],
                cutouts: [],
                createdAt: new Date().toISOString()
            }, null, 2),
            'cutouts/.gitkeep': '',
            'README.md': (name) => `# ${name}\n\nAgent pack for the Forge platform.\n\n## Structure\n\n- \`metadata.json\` - Pack metadata and configuration\n- \`cutouts/\` - Cutout images (.png, .jpg, .svg)\n\n## Development\n\nRun \`forge pack build ${name}\` to build this pack.\n`
        }
    },
    'web-extension': {
        name: 'Web Extension',
        description: 'Custom web UI extension for Forge',
        files: {
            'package.json': (name) => JSON.stringify({
                name: `forge-ext-${name}`,
                version: '1.0.0',
                type: 'module',
                scripts: {
                    build: 'tsc',
                    dev: 'tsc --watch'
                },
                dependencies: {},
                devDependencies: {
                    typescript: '^5.4.0'
                }
            }, null, 2),
            'tsconfig.json': JSON.stringify({
                compilerOptions: {
                    target: 'ES2022',
                    module: 'ESNext',
                    moduleResolution: 'node',
                    strict: true,
                    esModuleInterop: true,
                    outDir: 'dist'
                },
                include: ['src/**/*']
            }, null, 2),
            'src/index.ts': `// Forge Web Extension\n// This is the entry point for your extension\n\nexport function initialize() {\n  console.log('Extension initialized');\n}\n`,
            'README.md': (name) => `# ${name} Extension\n\nCustom web UI extension for the Forge platform.\n\n## Development\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n## Build\n\n\`\`\`bash\nnpm run build\n\`\`\`\n`
        }
    },
    'mcp-tool': {
        name: 'MCP Tool',
        description: 'Custom MCP tool for the registry',
        files: {
            'tool.py': (name) => `#!/usr/bin/env python3
"""\nMCP Tool: ${name}\n"""\n
from mcp.types import Tool, TextContent

TOOL_DEFINITION = Tool(
    name="${name}",
    description="Description of what ${name} does",
    inputSchema={
        "type": "object",
        "properties": {
            "param1": {
                "type": "string",
                "description": "First parameter"
            }
        },
        "required": ["param1"]
    }
)

async def execute(param1: str) -> list[TextContent]:
    """Execute the tool."""\n    result = f"Processed: {param1}"\n    return [TextContent(type="text", text=result)]
`,
            'README.md': (name) => `# ${name} MCP Tool\n\nCustom MCP tool for the Forge registry.\n\n## Installation\n\nAdd to your MCP registry configuration.\n\n## Usage\n\n\`\`\`python\nfrom ${name} import TOOL_DEFINITION, execute\n\nresult = await execute(param1="value")\n\`\`\`\n`
        }
    }
};
const program = new Command('init')
    .description('Initialize a new Forge project from a template')
    .argument('<project-name>', 'name of the project')
    .option('-t, --template <name>', 'template to use', 'pack')
    .option('-d, --directory <path>', 'directory to create (default: project-name)')
    .option('--force', 'overwrite existing directory')
    .action(async (projectName, options) => {
    printHeader('Initialize Project');
    // Validate template
    const template = TEMPLATES[options.template];
    if (!template) {
        printError(`Unknown template: ${options.template}`);
        printInfo('Available templates:');
        Object.entries(TEMPLATES).forEach(([key, t]) => {
            console.log(`  ${chalk.cyan(key.padEnd(15))} ${t.description}`);
        });
        process.exit(1);
    }
    // Determine target directory
    const targetDir = options.directory || projectName;
    const fullPath = join(process.cwd(), targetDir);
    // Check if directory exists
    if (existsSync(fullPath)) {
        if (options.force) {
            printWarning(`Directory exists, overwriting: ${targetDir}`);
        }
        else {
            printError(`Directory already exists: ${targetDir}`);
            printInfo('Use --force to overwrite or choose a different name');
            process.exit(1);
        }
    }
    printInfo(`Creating ${chalk.bold(template.name)}: ${chalk.cyan(projectName)}`);
    printInfo(`Location: ${fullPath}\n`);
    const spinner = ora('Creating project files...').start();
    try {
        // Create directory
        await mkdir(fullPath, { recursive: true });
        // Create files
        const createdFiles = [];
        for (const [filePath, content] of Object.entries(template.files)) {
            const fullFilePath = join(fullPath, filePath);
            // Create subdirectories if needed
            const dir = fullFilePath.substring(0, fullFilePath.lastIndexOf('/'));
            if (dir) {
                await mkdir(dir, { recursive: true });
            }
            // Write file
            const finalContent = typeof content === 'function'
                ? content(projectName)
                : content;
            await writeFile(fullFilePath, finalContent);
            createdFiles.push(filePath);
        }
        spinner.succeed('Project created');
        // Show summary
        console.log('');
        printSuccess(`${template.name} "${projectName}" created successfully`);
        console.log('');
        console.log(chalk.bold('Created files:'));
        createdFiles.forEach(file => {
            console.log(`  ${chalk.gray('✓')} ${file}`);
        });
        console.log('');
        console.log(chalk.bold('Next steps:'));
        console.log(`  cd ${targetDir}`);
        if (options.template === 'pack') {
            console.log('  forge pack build');
        }
        else if (options.template === 'web-extension') {
            console.log('  npm install');
            console.log('  npm run dev');
        }
        else if (options.template === 'mcp-tool') {
            console.log('  # Add to your MCP registry configuration');
        }
        console.log('');
    }
    catch (error) {
        spinner.fail('Failed to create project');
        printError(errorMessage(error));
        process.exit(1);
    }
});
// Add subcommand to list templates
program.addCommand(new Command('templates')
    .description('List available project templates')
    .action(() => {
    printHeader('Available Templates');
    Object.entries(TEMPLATES).forEach(([key, template]) => {
        console.log(`${chalk.bold.cyan(key)}`);
        console.log(`  ${template.description}`);
        console.log(`  Files: ${Object.keys(template.files).length}`);
        console.log('');
    });
    printInfo('Usage: forge init <name> --template <template-name>');
}));
export default program;
//# sourceMappingURL=init.js.map