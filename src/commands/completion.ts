import { Command } from 'commander';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import chalk from 'chalk';
import { printHeader, printSuccess, printInfo, printWarning, printError } from '../lib/output.js';

/* eslint-disable no-useless-escape */
// Declare shell variables that are provided at runtime
declare const COMP_WORDS: string[];
declare const COMP_CWORD: number;
declare const COMPREPLY: string[];
declare let cur: string;
declare let prev: string;
const BASH_COMPLETION = `
# Forge CLI Bash Completion
# Quick setup: source <(forge completion bash)
# Permanent:   forge completion bash --install

_forge_completions() {
  local cur prev
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"

  # Full list of top-level commands
  local commands="status doctor dev docs open pack pack/sync mcp config env logs monitor init plugin completion alias backup upgrade schedule notify workspace interactive remote deploy help"

  if [ $COMP_CWORD -eq 1 ]; then
    COMPREPLY=( \$(compgen -W "\${commands}" -- \${cur}) )
    return 0
  fi

  case "\${COMP_WORDS[1]}" in
    status)
      COMPREPLY=( \$(compgen -W "--watch --json --clear-locks --help" -- \${cur}) ) ;;
    dev)
      COMPREPLY=( \$(compgen -W "--with-docs --only-api --only-web --only-docs --forge-api-proxy --port-offset --force --log-to-file --help" -- \${cur}) ) ;;
    doctor)
      COMPREPLY=( \$(compgen -W "--strict --json --quick --deep --help" -- \${cur}) ) ;;
    docs)
      COMPREPLY=( \$(compgen -W "--port --no-open --help" -- \${cur}) ) ;;
    open)
      COMPREPLY=( \$(compgen -W "docs hub showcase catalog chat api" -- \${cur}) ) ;;
    remote)
      local remote_cmds="status login me packs"
      if [ $COMP_CWORD -eq 2 ]; then
        COMPREPLY=( \$(compgen -W "\${remote_cmds}" -- \${cur}) )
      fi ;;
    deploy)
      local deploy_cmds="list create start stop delete"
      if [ $COMP_CWORD -eq 2 ]; then
        COMPREPLY=( \$(compgen -W "\${deploy_cmds}" -- \${cur}) )
      fi ;;
    pack)
      local pack_cmds="list validate build metadata sync"
      if [ $COMP_CWORD -eq 2 ]; then
        COMPREPLY=( \$(compgen -W "\${pack_cmds}" -- \${cur}) )
      else
        case "\${COMP_WORDS[2]}" in
          list)     COMPREPLY=( \$(compgen -W "--catalog --theme --json" -- \${cur}) ) ;;
          validate) COMPREPLY=( \$(compgen -W "--strict" -- \${cur}) ) ;;
          build)    COMPREPLY=( \$(compgen -W "--watch --out" -- \${cur}) ) ;;
          metadata) COMPREPLY=( \$(compgen -W "--catalog --out --format" -- \${cur}) ) ;;
        esac
      fi ;;
    mcp)
      local mcp_cmds="start stop status test tools"
      if [ $COMP_CWORD -eq 2 ]; then
        COMPREPLY=( \$(compgen -W "\${mcp_cmds}" -- \${cur}) )
      fi ;;
    config)
      COMPREPLY=( \$(compgen -W "get set reset --json --help" -- \${cur}) ) ;;
    env)
      COMPREPLY=( \$(compgen -W "use list validate diff show" -- \${cur}) ) ;;
    logs)
      COMPREPLY=( \$(compgen -W "--follow --lines --level --list --clear --help" -- \${cur}) ) ;;
    alias)
      local alias_cmds="list set remove show run init"
      if [ $COMP_CWORD -eq 2 ]; then
        COMPREPLY=( \$(compgen -W "\${alias_cmds}" -- \${cur}) )
      fi ;;
    backup)
      COMPREPLY=( \$(compgen -W "create restore list delete auto --help" -- \${cur}) ) ;;
    schedule)
      COMPREPLY=( \$(compgen -W "add list remove run logs search --help" -- \${cur}) ) ;;
    notify)
      COMPREPLY=( \$(compgen -W "send config setup test --help" -- \${cur}) ) ;;
    workspace)
      COMPREPLY=( \$(compgen -W "list create switch info detect init --help" -- \${cur}) ) ;;
    upgrade)
      COMPREPLY=( \$(compgen -W "--check --force --help" -- \${cur}) ) ;;
    plugin)
      COMPREPLY=( \$(compgen -W "list search install uninstall update validate exec create" -- \${cur}) ) ;;
    init)
      COMPREPLY=( \$(compgen -W "pack web-extension mcp-tool templates --help" -- \${cur}) ) ;;
    completion)
      COMPREPLY=( \$(compgen -W "bash zsh fish" -- \${cur}) ) ;;
    *)
      COMPREPLY=() ;;
  esac
}
`;

const ZSH_COMPLETION = `
#compdef forge

# Forge CLI Zsh Completion
# Quick setup: source <(forge completion zsh)
# Permanent:   forge completion zsh --install

_forge_commands() {
  local -a commands
  commands=(
    'status:Show status of all Forge services'
    'doctor:Run comprehensive system diagnostics'
    'dev:Start Forge development services'
    'docs:Start Forge Docs server'
    'open:Open a Forge URL in the browser'
    'pack:Manage Agent Packs'
    'mcp:Manage MCP Registry server'
    'config:Manage CLI configuration'
    'env:Manage environment configurations'
    'logs:View and manage service logs'
    'monitor:Real-time monitoring dashboard'
    'init:Initialize a new project'
    'plugin:Manage Forge CLI plugins'
    'completion:Generate shell completion scripts'
    'alias:Manage command aliases'
    'backup:Backup and restore data'
    'upgrade:Upgrade Forge CLI'
    'schedule:Manage scheduled tasks'
    'notify:Manage notifications'
    'workspace:Manage workspaces'
    'interactive:Interactive guided mode'
    'remote:Manage remote forge connection'
    'deploy:Manage agent deployments'
    'help:Display help for a command'
  )
  _describe -t commands 'forge commands' commands
}

_forge_remote() {
  local -a remote_commands
  remote_commands=(
    'status:Show remote forge status'
    'login:Login to remote forge'
    'me:Show authenticated user profile'
    'packs:List remote packs'
  )
  _describe -t remote_commands 'remote commands' remote_commands
}

_forge_deploy() {
  local -a deploy_commands
  deploy_commands=(
    'list:List all deployments'
    'create:Create a new deployment'
    'start:Start a deployment'
    'stop:Stop a deployment'
    'delete:Delete a deployment'
  )
  _describe -t deploy_commands 'deploy commands' deploy_commands
}

_forge_pack() {
  local -a pack_commands
  pack_commands=(
    'list:List all packs'
    'validate:Validate pack schema'
    'build:Build pack metadata and cutouts'
    'metadata:Generate compact metadata for MCP'
    'sync:Sync packs with remote forge'
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
    'validate:Validate environment file'
    'diff:Compare two environment files'
    'show:Display current environment variables'
  )
  _describe -t env_commands 'env commands' env_commands
}

_forge_alias() {
  local -a alias_commands
  alias_commands=(
    'list:List all aliases'
    'set:Create or update an alias'
    'remove:Remove an alias'
    'show:Show alias details'
    'run:Execute an alias'
    'init:Add common shortcut aliases'
  )
  _describe -t alias_commands 'alias commands' alias_commands
}

_forge_open() {
  local -a targets
  targets=('docs' 'hub' 'showcase' 'catalog' 'chat' 'api')
  _describe -t targets 'open targets' targets
}

_forge() {
  local curcontext="$curcontext" state line
  typeset -A opt_args

  _arguments -C \
    '(-h --help)'{-h,--help}'[Show help]' \
    '(-V --version)'{-V,--version}'[Show version]' \
    '--verbose[Enable verbose output]' \
    '1: :_forge_commands' \
    '*::arg:->args'

  case $line[1] in
    pack)      _forge_pack ;;
    mcp)       _forge_mcp ;;
    plugin)    _forge_plugin ;;
    env)       _forge_env ;;
    alias)     _forge_alias ;;
    open)      _forge_open ;;
    dev)
      _arguments \
        '--with-docs[Start with documentation server]' \
        '--only-api[Start only the API]' \
        '--only-web[Start only the web app]' \
        '--only-docs[Start only Forge Docs]' \
        '--forge-api-proxy[Use API proxy instead of embedded catalog]' \
        '--port-offset[Add offset to all ports]:offset:(0 1000 2000)' \
        '--force[Force start even if services are already running]' \
        '--log-to-file[Redirect output to log file]'
      ;;
    doctor)
      _arguments \
        '--strict[Exit with code 1 on any warning]' \
        '--json[Output as JSON]' \
        '--quick[Skip heavy HTTP checks]' \
        '--deep[Run smoke tests]'
      ;;
    status)
      _arguments \
        '--watch[Watch mode, refresh every 5 seconds]' \
        '--json[Output as JSON]' \
        '--clear-locks[Clear stale lock files]'
      ;;
    remote)    _forge_remote ;;
    deploy)    _forge_deploy ;;
    *)
      _files ;;
  esac
}

compdef _forge forge
`;

const FISH_COMPLETION = `
# Forge CLI Fish Completion
# Quick setup: forge completion fish | source
# Permanent:   forge completion fish --install

# --- Top-level commands ---
complete -c forge -n '__fish_use_subcommand' -a 'status'      -d 'Show status of all services'
complete -c forge -n '__fish_use_subcommand' -a 'doctor'      -d 'Run system diagnostics'
complete -c forge -n '__fish_use_subcommand' -a 'dev'         -d 'Start development services'
complete -c forge -n '__fish_use_subcommand' -a 'docs'        -d 'Start Forge Docs server'
complete -c forge -n '__fish_use_subcommand' -a 'open'        -d 'Open a Forge URL in browser'
complete -c forge -n '__fish_use_subcommand' -a 'pack'        -d 'Manage Agent Packs'
complete -c forge -n '__fish_use_subcommand' -a 'mcp'         -d 'Manage MCP Registry'
complete -c forge -n '__fish_use_subcommand' -a 'config'      -d 'Manage CLI configuration'
complete -c forge -n '__fish_use_subcommand' -a 'env'         -d 'Manage environment files'
complete -c forge -n '__fish_use_subcommand' -a 'logs'        -d 'View and manage logs'
complete -c forge -n '__fish_use_subcommand' -a 'monitor'     -d 'Real-time monitoring dashboard'
complete -c forge -n '__fish_use_subcommand' -a 'init'        -d 'Initialize a new project'
complete -c forge -n '__fish_use_subcommand' -a 'plugin'      -d 'Manage plugins'
complete -c forge -n '__fish_use_subcommand' -a 'completion'  -d 'Generate shell completions'
complete -c forge -n '__fish_use_subcommand' -a 'alias'       -d 'Manage command aliases'
complete -c forge -n '__fish_use_subcommand' -a 'backup'      -d 'Backup and restore data'
complete -c forge -n '__fish_use_subcommand' -a 'upgrade'     -d 'Upgrade Forge CLI'
complete -c forge -n '__fish_use_subcommand' -a 'schedule'    -d 'Manage scheduled tasks'
complete -c forge -n '__fish_use_subcommand' -a 'notify'      -d 'Manage notifications'
complete -c forge -n '__fish_use_subcommand' -a 'workspace'   -d 'Manage workspaces'
complete -c forge -n '__fish_use_subcommand' -a 'interactive' -d 'Interactive guided mode'
complete -c forge -n '__fish_use_subcommand' -a 'remote'     -d 'Manage remote forge connection'
complete -c forge -n '__fish_use_subcommand' -a 'deploy'     -d 'Manage agent deployments'

# --- open targets ---
complete -c forge -n '__fish_seen_subcommand_from open' -a 'docs'     -d 'Forge Docs'
complete -c forge -n '__fish_seen_subcommand_from open' -a 'hub'      -d 'Documentation Hub'
complete -c forge -n '__fish_seen_subcommand_from open' -a 'showcase' -d 'Showcase'
complete -c forge -n '__fish_seen_subcommand_from open' -a 'catalog'  -d 'Catalog'
complete -c forge -n '__fish_seen_subcommand_from open' -a 'chat'     -d 'Chat handoff'
complete -c forge -n '__fish_seen_subcommand_from open' -a 'api'      -d 'API health'

# --- pack subcommands ---
complete -c forge -n '__fish_seen_subcommand_from pack' -a 'list'     -d 'List packs'
complete -c forge -n '__fish_seen_subcommand_from pack' -a 'validate' -d 'Validate pack schema'
complete -c forge -n '__fish_seen_subcommand_from pack' -a 'build'    -d 'Build pack'
complete -c forge -n '__fish_seen_subcommand_from pack' -a 'metadata' -d 'Generate compact metadata'
complete -c forge -n '__fish_seen_subcommand_from pack' -a 'sync'    -d 'Sync packs with remote forge'

# --- remote subcommands ---
complete -c forge -n '__fish_seen_subcommand_from remote' -a 'status' -d 'Show remote forge status'
complete -c forge -n '__fish_seen_subcommand_from remote' -a 'login'  -d 'Login to remote forge'
complete -c forge -n '__fish_seen_subcommand_from remote' -a 'me'     -d 'Show authenticated user profile'
complete -c forge -n '__fish_seen_subcommand_from remote' -a 'packs'  -d 'List remote packs'

# --- deploy subcommands ---
complete -c forge -n '__fish_seen_subcommand_from deploy' -a 'list'   -d 'List all deployments'
complete -c forge -n '__fish_seen_subcommand_from deploy' -a 'create' -d 'Create a new deployment'
complete -c forge -n '__fish_seen_subcommand_from deploy' -a 'start'  -d 'Start a deployment'
complete -c forge -n '__fish_seen_subcommand_from deploy' -a 'stop'   -d 'Stop a deployment'
complete -c forge -n '__fish_seen_subcommand_from deploy' -a 'delete' -d 'Delete a deployment'

# --- mcp subcommands ---
complete -c forge -n '__fish_seen_subcommand_from mcp' -a 'start'  -d 'Start MCP registry'
complete -c forge -n '__fish_seen_subcommand_from mcp' -a 'stop'   -d 'Stop MCP registry'
complete -c forge -n '__fish_seen_subcommand_from mcp' -a 'status' -d 'MCP status'
complete -c forge -n '__fish_seen_subcommand_from mcp' -a 'test'   -d 'Test MCP'
complete -c forge -n '__fish_seen_subcommand_from mcp' -a 'tools'  -d 'MCP tools'

# --- alias subcommands ---
complete -c forge -n '__fish_seen_subcommand_from alias' -a 'list'   -d 'List aliases'
complete -c forge -n '__fish_seen_subcommand_from alias' -a 'set'    -d 'Create or update'
complete -c forge -n '__fish_seen_subcommand_from alias' -a 'remove' -d 'Remove an alias'
complete -c forge -n '__fish_seen_subcommand_from alias' -a 'show'   -d 'Show alias details'
complete -c forge -n '__fish_seen_subcommand_from alias' -a 'run'    -d 'Execute an alias'
complete -c forge -n '__fish_seen_subcommand_from alias' -a 'init'   -d 'Add common aliases'

# --- plugin subcommands ---
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'list'      -d 'List plugins'
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'search'    -d 'Search plugins'
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'install'   -d 'Install plugin'
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'uninstall' -d 'Uninstall plugin'
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'update'    -d 'Update plugin'
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'validate'  -d 'Validate plugin'
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'exec'      -d 'Execute plugin command'
complete -c forge -n '__fish_seen_subcommand_from plugin' -a 'create'    -d 'Create new plugin'

# --- env subcommands ---
complete -c forge -n '__fish_seen_subcommand_from env' -a 'use'      -d 'Switch environment'
complete -c forge -n '__fish_seen_subcommand_from env' -a 'list'     -d 'List environments'
complete -c forge -n '__fish_seen_subcommand_from env' -a 'validate' -d 'Validate environment'
complete -c forge -n '__fish_seen_subcommand_from env' -a 'diff'     -d 'Compare environments'
complete -c forge -n '__fish_seen_subcommand_from env' -a 'show'     -d 'Show variables'

# --- dev options ---
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'with-docs'       -d 'Start with docs server'
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'only-api'        -d 'API only'
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'only-web'        -d 'Web only'
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'only-docs'       -d 'Docs only'
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'forge-api-proxy' -d 'Use API proxy'
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'port-offset'     -r -d 'Port offset'
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'force'           -d 'Force restart'
complete -c forge -n '__fish_seen_subcommand_from dev' -l 'log-to-file'     -d 'Log to file'

# --- doctor options ---
complete -c forge -n '__fish_seen_subcommand_from doctor' -l 'strict' -d 'Exit 1 on warnings'
complete -c forge -n '__fish_seen_subcommand_from doctor' -l 'json'   -d 'JSON output'
complete -c forge -n '__fish_seen_subcommand_from doctor' -l 'quick'  -d 'Skip HTTP checks'
complete -c forge -n '__fish_seen_subcommand_from doctor' -l 'deep'   -d 'Run smoke tests'

# --- status options ---
complete -c forge -n '__fish_seen_subcommand_from status' -l 'watch'       -d 'Watch mode'
complete -c forge -n '__fish_seen_subcommand_from status' -l 'json'        -d 'JSON output'
complete -c forge -n '__fish_seen_subcommand_from status' -l 'clear-locks' -d 'Clear stale locks'

# --- global options ---
complete -c forge -l 'verbose' -d 'Enable verbose output'
complete -c forge -l 'help'    -d 'Show help'
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
