import { Command } from 'commander';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import { printHeader, printSuccess, printInfo, printWarning, printError } from '../lib/output.js';

const BASH_COMPLETION = `
# Forge CLI Bash Completion
# Source this file: source <(forge completion bash)

_forge_completions() {
  local cur prev opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  
  # Main commands
  local commands="status doctor dev docs open pack mcp config env logs monitor init plugin completion alias help"
  
  # Subcommands based on first argument
  if [ $COMP_CWORD -eq 1 ]; then
    COMPREPLY=( $(compgen -W "\${commands}" -- \${cur}) )
    return 0
  fi
  
  # Complete based on command
  case "\${COMP_WORDS[1]}" in
    dev)
      local opts="--with-docs --only-api --only-web --only-docs --port-offset --force --help"
      COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
      ;;
    doctor)
      local opts="--strict --json --quick --deep --help"
      COMPREPLY=( $(compgen -W "\${opts}" -- \${cur}) )
      ;;
    pack)
      local pack_commands="list validate build metadata"
      COMPREPLY=( $(compgen -W "\${pack_commands}" -- \${cur}) )
      ;;
    mcp)
      local mcp_commands="start stop status test tools"
      COMPREPLY=( $(compgen -W "\${mcp_commands}" -- \${cur}) )
      ;;
    plugin)
      local plugin_commands="list search install uninstall update validate exec create"
      COMPREPLY=( $(compgen -W "\${plugin_commands}" -- \${cur}) )
      ;;
    env)
      local env_commands="use list validate diff show"
      COMPREPLY=( $(compgen -W "\${env_commands}" -- \${cur}) )
      ;;
    logs)
      local log_opts="--follow --lines --level --list --clear --help"
      COMPREPLY=( $(compgen -W "\${log_opts}" -- \${cur}) )
      ;;
    *)
      COMPREPLY=()
      ;;
  esac
}

complete -F _forge_completions forge
`;

const ZSH_COMPLETION = `
#compdef forge

# Forge CLI Zsh Completion

_forge_commands() {
  local -a commands
  commands=(
    'status:Show status of all Forge services'
    'doctor:Run comprehensive system diagnostics'
    'dev:Start Forge development services'
    'docs:Start Forge Docs server'
    'open:Open services in browser'
    'pack:Manage Agent Packs'
    'mcp:Manage MCP Registry server'
    'config:Manage CLI configuration'
    'env:Manage environment configurations'
    'logs:View and manage service logs'
    'monitor:Real-time dashboard for monitoring'
    'init:Initialize a new Forge project'
    'plugin:Manage Forge CLI plugins'
    'completion:Generate shell completions'
    'help:Display help for command'
  )
  _describe -t commands 'forge commands' commands
}

_forge_pack() {
  local -a pack_commands
  pack_commands=(
    'list:List all packs'
    'validate:Validate pack structure'
    'build:Build pack metadata and cutouts'
    'metadata:Generate compact metadata for MCP'
  )
  _describe -t pack_commands 'pack commands' pack_commands
}

_forge_mcp() {
  local -a mcp_commands
  mcp_commands=(
    'start:Start the MCP registry server'
    'stop:Stop the MCP registry server'
    'status:Show MCP registry status'
    'test:Test MCP registry connectivity'
    'tools:List and call MCP tools'
  )
  _describe -t mcp_commands 'mcp commands' mcp_commands
}

_forge_plugin() {
  local -a plugin_commands
  plugin_commands=(
    'list:List installed plugins'
    'search:Search for available plugins'
    'install:Install a plugin'
    'uninstall:Uninstall a plugin'
    'update:Update a plugin'
    'validate:Validate a plugin'
    'exec:Execute a plugin command'
    'create:Create a new plugin'
  )
  _describe -t plugin_commands 'plugin commands' plugin_commands
}

_forge_env() {
  local -a env_commands
  env_commands=(
    'use:Switch to a different environment'
    'list:List all environments'
    'validate:Validate environment'
    'diff:Compare environments'
    'show:Display environment variables'
  )
  _describe -t env_commands 'env commands' env_commands
}

_forge() {
  local curcontext="$curcontext" state line
  typeset -A opt_args
  
  _arguments -C \\
    '(-h --help)'{-h,--help}'[Show help]' \\
    '(-V --version)'{-V,--version}'[Show version]' \\
    '1: :_forge_commands' \\
    '*::arg:->args'
  
  case $line[1] in
    pack)
      _forge_pack
      ;;
    mcp)
      _forge_mcp
      ;;
    plugin)
      _forge_plugin
      ;;
    env)
      _forge_env
      ;;
    doctor)
      _arguments \
        '--strict[Exit with code 1 on any warning]' \
        '--json[Output as JSON]' \
        '--quick[Skip heavy HTTP checks]' \
        '--deep[Run smoke-test, smoke-auth, optional smoke-http]'
      ;;
    *)
      _files
      ;;
  esac
}

compdef _forge forge
`;

const FISH_COMPLETION = `
# Forge CLI Fish Completion

# Main commands
complete -c forge -n '__fish_use_subcommand' -a 'status' -d 'Show status of all services'
complete -c forge -n '__fish_use_subcommand' -a 'doctor' -d 'Run system diagnostics'
complete -c forge -n '__fish_use_subcommand' -a 'dev' -d 'Start development services'
complete -c forge -n '__fish_use_subcommand' -a 'docs' -d 'Start docs server'
complete -c forge -n '__fish_use_subcommand' -a 'open' -d 'Open in browser'
complete -c forge -n '__fish_use_subcommand' -a 'pack' -d 'Manage Agent Packs'
complete -c forge -n '__fish_use_subcommand' -a 'mcp' -d 'Manage MCP Registry'
complete -c forge -n '__fish_use_subcommand' -a 'config' -d 'Manage configuration'
complete -c forge -n '__fish_use_subcommand' -a 'env' -d 'Manage environments'
complete -c forge -n '__fish_use_subcommand' -a 'logs' -d 'View logs'
complete -c forge -n '__fish_use_subcommand' -a 'monitor' -d 'Real-time dashboard'
complete -c forge -n '__fish_use_subcommand' -a 'init' -d 'Initialize project'
complete -c forge -n '__fish_use_subcommand' -a 'plugin' -d 'Manage plugins'
complete -c forge -n '__fish_use_subcommand' -a 'completion' -d 'Generate completions'

# Pack subcommands
complete -c forge -n '__fish_seen_subcommand_from pack' -a 'list' -d 'List packs'
complete -c forge -n '__fish_seen_subcommand_from pack' -a 'validate' -d 'Validate pack'
complete -c forge -n '__fish_seen_subcommand_from pack' -a 'build' -d 'Build pack'
complete -c forge -n '__fish_seen_subcommand_from pack' -a 'metadata' -d 'Generate metadata'

# MCP subcommands
complete -c forge -n '__fish_seen_subcommand_from mcp' -a 'start' -d 'Start MCP registry'
complete -c forge -n '__fish_seen_subcommand_from mcp' -a 'stop' -d 'Stop MCP registry'
complete -c forge -n '__fish_seen_subcommand_from mcp' -a 'status' -d 'MCP status'
complete -c forge -n '__fish_seen_subcommand_from mcp' -a 'test' -d 'Test MCP'
complete -c forge -n '__fish_seen_subcommand_from mcp' -a 'tools' -d 'MCP tools'

# Plugin subcommands
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'list' -d 'List plugins'
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'search' -d 'Search plugins'
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'install' -d 'Install plugin'
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'uninstall' -d 'Uninstall plugin'
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'update' -d 'Update plugin'

# Dev options
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'with-docs' -d 'Start with docs'
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'only-api' -d 'API only'
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'only-web' -d 'Web only'
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'only-docs' -d 'Docs only'
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'port-offset' -r -d 'Port offset'
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'force' -d 'Force restart'

# Doctor options
complete -c forge -n '__fish_seen_subcommand_from doctor' -l 'strict' -d 'Exit 1 on warnings'
complete -c forge -n '__fish_seen_subcommand_from doctor' -l 'json' -d 'JSON output'
complete -c forge -n '__fish_seen_subcommand_from doctor' -l 'quick' -d 'Skip heavy checks'
complete -c forge -n '__fish_seen_subcommand_from doctor' -l 'deep' -d 'Run smoke tests'

# Global options
complete -c forge -l 'verbose' -d 'Enable verbose output'
complete -c forge -l 'help' -d 'Show help'
complete -c forge -l 'version' -d 'Show version'
`;

const SHELL_CONFIGS = {
  bash: {
    filename: 'forge-completion.bash',
    content: BASH_COMPLETION,
    installPath: '~/.bashrc',
    sourceCmd: 'source <(forge completion bash)'
  },
  zsh: {
    filename: '_forge',
    content: ZSH_COMPLETION,
    installPath: '~/.zsh/completions/',
    sourceCmd: 'source <(forge completion zsh)'
  },
  fish: {
    filename: 'forge.fish',
    content: FISH_COMPLETION,
    installPath: '~/.config/fish/completions/',
    sourceCmd: 'forge completion fish | source'
  }
};

const program = new Command('completion')
  .description('Generate shell completion scripts')
  .argument('<shell>', 'shell type (bash, zsh, fish)')
  .option('--install', 'install to shell config file')
  .option('--print', 'print completion script to stdout')
  .action(async (shell, options) => {
    const config = SHELL_CONFIGS[shell as keyof typeof SHELL_CONFIGS];
    
    if (!config) {
      printError(`Unknown shell: ${shell}`);
      printInfo('Supported shells: bash, zsh, fish');
      process.exit(1);
    }
    
    if (options.print) {
      // Just print the script
      console.log(config.content.trim());
      return;
    }
    
    if (options.install) {
      // Install to config file
      printHeader('Install Shell Completion');
      
      const installDir = config.installPath.replace('~', homedir());
      const installFile = join(installDir, shell === 'zsh' ? '_forge' : 
                                           shell === 'fish' ? 'forge.fish' : 
                                           'forge-completion.bash');
      
      try {
        await mkdir(installDir, { recursive: true });
        await writeFile(installFile, config.content.trim());
        
        printSuccess(`Completion installed to: ${installFile}`);
        printInfo('\nAdd this to your shell config:');
        printInfo(chalk.cyan(config.sourceCmd));
        
        if (shell === 'bash') {
          printInfo('\nOr add to ~/.bashrc:');
          printInfo(chalk.cyan(`source ${installFile}`));
        } else if (shell === 'zsh') {
          printInfo('\nMake sure ~/.zsh/completions is in your $fpath');
        } else if (shell === 'fish') {
          printInfo('\nFish completions are automatically loaded');
        }
        
      } catch (error: any) {
        printError(`Failed to install: ${error.message}`);
        process.exit(1);
      }
    } else {
      // Default: show instructions
      printHeader(`${shell} Completion`);
      
      printInfo('Quick setup:');
      console.log('');
      console.log(chalk.cyan(`  ${config.sourceCmd}`));
      console.log('');
      
      printInfo('Or install permanently:');
      console.log('');
      console.log(chalk.cyan(`  forge completion ${shell} --install`));
      console.log('');
      
      printInfo('Completion script:');
      console.log(config.content.trim());
    }
  });

export default program;
