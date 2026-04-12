import { Command } from 'commander';
import chalk from 'chalk';
import { checkMultipleHealth } from '../lib/healthCheck.js';
import { detectWsl } from '../lib/wslDetector.js';
import { config } from '../lib/configManager.js';
import { 
  getAllLocks, 
  isLockValid
} from '../lib/lockManager.js';
import { isMcpRunning } from '../lib/mcpManager.js';
import { printHeader, printError } from '../lib/output.js';

interface ServiceStatus {
  key: string;
  name: string;
  port: number;
  url: string;
  state: 'up' | 'down' | 'crashed' | 'starting';
  pid?: number;
  uptime?: number;
  responseTime?: number;
  restartCount: number;
  cpu?: number;
  memory?: number;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
  return `${Math.floor(ms / 3600000)}h`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

function clearScreen() {
  // Clear screen and move cursor to top
  process.stdout.write('\x1Bc\x1B[3J\x1B[H');
}

function drawBox(title: string, content: string[], width = 60): string {
  const horizontal = '─'.repeat(width - 2);
  const top = `┌${horizontal}┐`;
  const bottom = `└${horizontal}┘`;
  
  const lines = content.map(line => {
    const padded = line.slice(0, width - 4);
    const padding = ' '.repeat(Math.max(0, width - 4 - padded.length));
    return `│ ${padded}${padding} │`;
  });
  
  const titleLine = `│ ${chalk.bold.cyan(title)}${' '.repeat(Math.max(0, width - 4 - title.length))} │`;
  
  return [top, titleLine, ...lines, bottom].join('\n');
}

function getStateColor(state: string): (text: string) => string {
  switch (state) {
    case 'up': return chalk.green;
    case 'down': return chalk.gray;
    case 'crashed': return chalk.red;
    case 'starting': return chalk.yellow;
    default: return chalk.white;
  }
}

function getStateIcon(state: string): string {
  switch (state) {
    case 'up': return '●';
    case 'down': return '○';
    case 'crashed': return '✗';
    case 'starting': return '◐';
    default: return '?';
  }
}

async function fetchServiceStats(service: ServiceStatus): Promise<void> {
  // Try to get process stats if we have a PID
  if (service.pid && service.state === 'up') {
    try {
      const { execa } = await import('execa');
      const { stdout } = await execa('ps', ['-p', String(service.pid), '-o', '%cpu=,%mem=,rss=', '--no-headers'], {
        reject: false,
        timeout: 1000
      });
      
      if (stdout) {
        const parts = stdout.trim().split(/\s+/);
        if (parts.length >= 3) {
          service.cpu = parseFloat(parts[0]) || undefined;
          service.memory = parseInt(parts[2], 10) * 1024 || undefined; // rss is in KB
        }
      }
    } catch {
      // Ignore errors
    }
  }
}

async function getAllServiceStatus(): Promise<ServiceStatus[]> {
  const cfg = config.get();
  
  const services: ServiceStatus[] = [
    { key: 'web', name: 'Web (Vite)', port: cfg.ports.web, url: `http://127.0.0.1:${cfg.ports.web}`, state: 'down', restartCount: 0 },
    { key: 'api', name: 'API', port: cfg.ports.api, url: `http://127.0.0.1:${cfg.ports.api}/health`, state: 'down', restartCount: 0 },
    { key: 'docs', name: 'Docs (VitePress)', port: cfg.ports.docs, url: `http://127.0.0.1:${cfg.ports.docs}`, state: 'down', restartCount: 0 },
    { key: 'mcp', name: 'MCP Registry', port: cfg.ports.mcp, url: `http://127.0.0.1:${cfg.ports.mcp}/health`, state: 'down', restartCount: 0 }
  ];
  
  // Get locks
  const allLocks = await getAllLocks();
  const lockMap = new Map(allLocks.map(l => [l.service, l]));
  
  // Check health for each service
  const healthResults = await checkMultipleHealth(services.map(s => s.url));
  
  for (let i = 0; i < services.length; i++) {
    const service = services[i];
    const lock = lockMap.get(service.key);
    const health = healthResults[i];
    
    if (!lock) {
      service.state = 'down';
    } else {
      const isValid = await isLockValid(service.key);
      if (!isValid) {
        service.state = 'crashed';
        service.pid = lock.pid;
      } else {
        service.pid = lock.pid;
        service.restartCount = lock.restartCount || 0;
        
        // Calculate uptime
        const startTime = new Date(lock.startTime).getTime();
        service.uptime = Date.now() - startTime;
        
        if (health.status === 'up') {
          service.state = 'up';
          service.responseTime = health.responseTime;
        } else {
          service.state = 'starting'; // Lock valid but not healthy yet
        }
      }
    }
    
    // Fetch stats for running services
    await fetchServiceStats(service);
  }
  
  return services;
}

function renderDashboard(services: ServiceStatus[]): void {
  clearScreen();
  
  const timestamp = new Date().toLocaleString();
  console.log(chalk.bold.cyan(`\n  🔥 Forge Monitor - ${timestamp}\n`));
  
  // Service status section
  console.log(chalk.bold('  Services:'));
  console.log('');
  
  for (const service of services) {
    const stateColor = getStateColor(service.state);
    const icon = getStateIcon(service.state);
    
    // Main line: Icon Name Port Status
    const statusLine = `    ${stateColor(icon)} ${chalk.bold(service.name.padEnd(20))} ${String(service.port).padStart(4)}   ${stateColor(service.state.toUpperCase())}`;
    console.log(statusLine);
    
    // Details line (if running)
    if (service.state === 'up' || service.state === 'starting') {
      const details: string[] = [];
      
      if (service.pid) details.push(`PID:${service.pid}`);
      if (service.uptime) details.push(`Uptime:${formatDuration(service.uptime)}`);
      if (service.responseTime) details.push(`${service.responseTime}ms`);
      if (service.cpu !== undefined) details.push(`CPU:${service.cpu.toFixed(1)}%`);
      if (service.memory) details.push(`MEM:${formatBytes(service.memory)}`);
      if (service.restartCount > 0) details.push(chalk.yellow(`⚠ ${service.restartCount} restarts`));
      
      if (details.length > 0) {
        console.log(`         ${chalk.gray(details.join(' | '))}`);
      }
    } else if (service.state === 'crashed') {
      console.log(`         ${chalk.red(`Stale PID: ${service.pid}`)}`);
    }
    
    console.log('');
  }
  
  // Summary box
  const upCount = services.filter(s => s.state === 'up').length;
  const crashedCount = services.filter(s => s.state === 'crashed').length;
  const downCount = services.filter(s => s.state === 'down').length;
  
  const summaryLines: string[] = [];
  
  if (upCount === services.length) {
    summaryLines.push(chalk.green(`  ✓ All ${upCount} services healthy`));
  } else {
    summaryLines.push(`  ${chalk.green(`● ${upCount} up`)}  ${chalk.red(`✗ ${crashedCount} crashed`)}  ${chalk.gray(`○ ${downCount} down`)}`);
  }
  
  const wsl = detectWsl();
  if (wsl.isWsl2) {
    summaryLines.push('');
    summaryLines.push(chalk.gray(`  WSL2 Host: ${wsl.hostIp || 'auto-detected'}`));
  }
  
  summaryLines.push('');
  summaryLines.push(chalk.gray('  Press Ctrl+C to exit'));
  
  console.log(summaryLines.join('\n'));
  console.log('');
}

const program = new Command('monitor')
  .description('Real-time dashboard for monitoring all Forge services')
  .option('-i, --interval <ms>', 'refresh interval in milliseconds', '2000')
  .option('--once', 'run once and exit (no continuous monitoring)')
  .action(async (options) => {
    const interval = parseInt(options.interval, 10);
    
    if (options.once) {
      // Single run mode
      const services = await getAllServiceStatus();
      renderDashboard(services);
      return;
    }
    
    // Continuous monitoring mode
    printHeader('Forge Monitor');
    console.log(chalk.gray(`Refreshing every ${interval}ms...\n`));
    
    let running = true;
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      running = false;
      clearScreen();
      console.log(chalk.green('\n✓ Monitor stopped\n'));
      process.exit(0);
    });
    
    // Initial render
    const services = await getAllServiceStatus();
    renderDashboard(services);
    
    // Update loop
    while (running) {
      await new Promise(resolve => setTimeout(resolve, interval));
      
      if (!running) break;
      
      try {
        const updatedServices = await getAllServiceStatus();
        renderDashboard(updatedServices);
      } catch (error) {
        // Ignore errors during refresh
      }
    }
  });

export default program;
