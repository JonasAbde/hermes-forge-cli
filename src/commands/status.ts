import { Command } from 'commander';
import chalk from 'chalk';
import { execa } from 'execa';
import { checkMultipleHealth } from '../lib/healthCheck.js';
import { detectWsl } from '../lib/wslDetector.js';
import { printHeader, printInfo, printWarning, printSuccess, printError } from '../lib/output.js';
import { config } from '../lib/configManager.js';
import { detectEnvironment } from '../lib/envDetector.js';
import { 
  getAllLocks, 
  isLockValid, 
  clearStaleLocks
} from '../lib/lockManager.js';

// ── Systemd service discovery ────────────────────────────────────────────
const FORGE_SERVICES = ['forge-web', 'forge-api', 'forge-docs', 'forge-mcp'];

interface SystemdServiceInfo {
  unit: string;
  activeState: string;
  subState: string;
  pid: number;
  uptime: string;
  memory: string;
  restarts: number;
  loadState: string;
  description: string;
}

/** Parse `systemctl show` key=value output into a map. */
function parseSystemctlShow(stdout: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of stdout.split('\n')) {
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    map[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return map;
}

/** Calculate human-readable uptime from an ActiveEnterTimestamp. */
function calcUptime(ts: string): string {
  // systemd timestamps look like: "Mon 2026-05-10 12:00:00 UTC"
  const start = new Date(ts);
  if (isNaN(start.getTime())) return 'unknown';
  const diff = Date.now() - start.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return `${hours}h ${remMins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/** Fetch systemd properties for a single unit. */
async function getSystemdServiceInfo(unit: string): Promise<SystemdServiceInfo | null> {
  try {
    const { stdout } = await execa(
      'systemctl', 
      ['show', unit, '--property=ActiveState,SubState,MainPID,ActiveEnterTimestamp,MemoryCurrent,NRestarts,LoadState,Description'],
      { reject: false, timeout: 10_000 }
    );
    if (!stdout) return null;
    const props = parseSystemctlShow(stdout);
    if (!props.ActiveState) return null;
    return {
      unit,
      activeState: props.ActiveState ?? 'unknown',
      subState: props.SubState ?? 'unknown',
      pid: parseInt(props.MainPID ?? '0', 10),
      uptime: calcUptime(props.ActiveEnterTimestamp ?? ''),
      memory: props.MemoryCurrent ?? 'N/A',
      restarts: parseInt(props.NRestarts ?? '0', 10),
      loadState: props.LoadState ?? 'unknown',
      description: props.Description ?? unit,
    };
  } catch {
    return null;
  }
}

/** Collect health endpoint results alongside systemd info. */
interface HealthEndpointResult {
  url: string;
  status: 'up' | 'down';
  responseTime?: number;
}

async function checkHealthEndpoints(): Promise<HealthEndpointResult[]> {
  const cfg = config.get();
  const urls = [
    { key: 'web', url: `http://127.0.0.1:${cfg.ports.web}` },
    { key: 'api', url: `http://127.0.0.1:${cfg.ports.api}/health` },
    { key: 'docs', url: `http://127.0.0.1:${cfg.ports.docs}` },
    { key: 'mcp', url: `http://127.0.0.1:${cfg.ports.mcp}/health` },
  ];
  const results: HealthEndpointResult[] = [];
  for (const ep of urls) {
    const start = Date.now();
    try {
      const res = await fetch(ep.url, { method: 'GET', signal: AbortSignal.timeout(5_000) });
      results.push({
        url: ep.url,
        status: res.ok ? 'up' : 'down',
        responseTime: Date.now() - start,
      });
    } catch {
      results.push({ url: ep.url, status: 'down' });
    }
  }
  return results;
}

const program = new Command('status')
  .description('Show status of all Forge services')
  .option('--watch', 'watch mode - refresh every 5 seconds')
  .option('--json', 'output as JSON')
  .option('--clear-locks', 'clear stale lock files for dead processes')
  .option('--systemd', 'show system-level service status (systemd units) on production VPS')
  .action(async (options) => {
    const cfg = config.get();
    
    // Handle --clear-locks flag
    if (options.clearLocks) {
      printHeader('Forge Lock Cleanup');
      const cleared = await clearStaleLocks();
      if (cleared.length > 0) {
        printSuccess(`Cleared ${cleared.length} stale lock(s): ${cleared.join(', ')}`);
      } else {
        printInfo('No stale locks found.');
      }
      console.log('');
    }

    // ── Handle --systemd flag ──────────────────────────────────────────
    if (options.systemd) {
      const env = await detectEnvironment();

      if (!env.hasSystemd) {
        printHeader('Forge Status (systemd)');
        printError('systemd is not available on this machine.');
        printInfo('This flag is for production VPS where Forge runs as systemd services.');
        printInfo('');
        printInfo('  • Run without --systemd for lock-file-based status:');
        printInfo('    forge status');
        printInfo('  • To set up Forge services on this machine, see:');
        printInfo('    forge deploy or the Forge admin guide.');
        return;
      }

      if (!env.hasForgeServices) {
        printHeader('Forge Status (systemd)');
        printWarning('Forge systemd services not detected on this host.');
        printInfo('No forge-* service units are registered with systemd.');
        printInfo('');
        printInfo('  • Run without --systemd for lock-file-based status:');
        printInfo('    forge status');
        printInfo('  • Deploy Forge services first:');
        printInfo('    forge deploy');
        return;
      }

      // Gather systemd info for all forge services
      const serviceInfos = await Promise.all(
        FORGE_SERVICES.map(unit => getSystemdServiceInfo(unit))
      );

      // Gather health endpoint results
      const healthResults = await checkHealthEndpoints();

      // JSON mode
      if (options.json) {
        const jsonOutput = FORGE_SERVICES.map((unit, i) => {
          const svc = serviceInfos[i];
          const health = healthResults[i] ?? { url: '', status: 'down' as const };
          return {
            unit,
            description: svc?.description ?? 'not found',
            activeState: svc?.activeState ?? 'not-found',
            subState: svc?.subState ?? '',
            loadState: svc?.loadState ?? 'not-found',
            pid: svc?.pid ?? 0,
            uptime: svc?.uptime ?? 'N/A',
            memory: svc?.memory ?? 'N/A',
            restarts: svc?.restarts ?? 0,
            healthEndpoint: health.status,
            healthResponseTime: health.responseTime ?? null,
          };
        });

        console.log(JSON.stringify({
          mode: 'systemd',
          services: jsonOutput,
          hostname: env.hostname,
          timestamp: new Date().toISOString(),
        }, null, 2));
        return;
      }

      // Terminal output
      printHeader('Forge Status (systemd)');
      console.log(`  ${chalk.gray('Host:')} ${env.hostname}`);
      console.log('');

      const { default: Table } = await import('cli-table3');
      const table = new Table({
        head: [
          chalk.bold('Service'),
          chalk.bold('Status'),
          chalk.bold('PID'),
          chalk.bold('Uptime'),
          chalk.bold('Memory'),
          chalk.bold('Restarts'),
          chalk.bold('Health'),
        ],
        colWidths: [18, 14, 8, 14, 14, 10, 10],
        style: { head: ['cyan'] },
      });

      for (let i = 0; i < FORGE_SERVICES.length; i++) {
        const svc = serviceInfos[i];
        const health = healthResults[i];

        if (!svc) {
          table.push([
            FORGE_SERVICES[i],
            chalk.gray('not found'),
            '-',
            '-',
            '-',
            '-',
            chalk.gray('-'),
          ]);
          continue;
        }

        const statusColor = svc.activeState === 'active'
          ? chalk.green(svc.activeState)
          : svc.activeState === 'inactive'
            ? chalk.gray(svc.activeState)
            : chalk.red(svc.activeState);

        const pidStr = svc.pid > 0 ? String(svc.pid) : chalk.gray('-');
        const memStr = svc.memory !== 'N/A' ? svc.memory : chalk.gray('-');
        const healthStr = health
          ? health.status === 'up'
            ? chalk.green('✓') + (health.responseTime ? ` ${health.responseTime}ms` : '')
            : chalk.red('✗')
          : chalk.gray('-');

        table.push([
          svc.unit.replace('forge-', ''),
          statusColor,
          pidStr,
          svc.uptime,
          memStr,
          String(svc.restarts),
          healthStr,
        ]);
      }

      console.log(table.toString());
      console.log('');
      printInfo(`Forge systemd services: ${serviceInfos.filter(Boolean).length}/${FORGE_SERVICES.length} units found`);
      return;
    }

    const services = [
      { key: 'web', name: 'Web (Vite)', port: cfg.ports.web, url: `http://127.0.0.1:${cfg.ports.web}` },
      { key: 'api', name: 'API', port: cfg.ports.api, url: `http://127.0.0.1:${cfg.ports.api}/health` },
      { key: 'docs', name: 'Docs (VitePress)', port: cfg.ports.docs, url: `http://127.0.0.1:${cfg.ports.docs}` },
      { key: 'mcp', name: 'MCP Registry', port: cfg.ports.mcp, url: `http://127.0.0.1:${cfg.ports.mcp}/health` }
    ];

    const wsl = detectWsl();

    // Get all locks and check validity
    const allLocks = await getAllLocks();

    // Check health for all services
    const healthStatus = await checkMultipleHealth(services.map(s => s.url));

    if (options.json) {
      const jsonOutput = await Promise.all(services.map(async (service, i) => {
        const lock = allLocks.find(l => l.service === service.key);
        const isValid = lock ? await isLockValid(service.key) : false;
        const health = healthStatus[i];
        
        let state: 'up' | 'crashed' | 'down';
        if (!lock) {
          state = 'down';
        } else if (!isValid) {
          state = 'crashed';
        } else {
          state = health.status === 'up' ? 'up' : 'down';
        }

        return {
          name: service.name,
          key: service.key,
          port: service.port,
          state,
          pid: lock?.pid,
          restartCount: lock?.restartCount || 0,
          lockFile: !!lock,
          health: health.status,
          responseTime: health.responseTime,
          url: service.url
        };
      }));

      console.log(JSON.stringify({
        services: jsonOutput,
        wsl,
        timestamp: new Date().toISOString()
      }, null, 2));
      return;
    }

    printHeader('Forge Status');

    // Build table data with lock-based status
    const tableData = await Promise.all(services.map(async (service, i) => {
      const lock = allLocks.find(l => l.service === service.key);
      const isValid = lock ? await isLockValid(service.key) : false;
      const health = healthStatus[i];
      
      let status: 'UP' | 'CRASHED' | 'DOWN';
      let statusColor: (text: string) => string;
      const details: string[] = [];

      if (!lock) {
        // No lock file = DOWN
        status = 'DOWN';
        statusColor = chalk.gray;
      } else if (!isValid) {
        // Lock exists but pid is dead = CRASHED
        status = 'CRASHED';
        statusColor = chalk.red;
        details.push(`stale pid ${lock.pid}`);
      } else {
        // Lock valid, check health
        if (health.status === 'up') {
          status = 'UP';
          statusColor = chalk.green;
          details.push(`pid ${lock.pid}`);
        } else {
          status = 'CRASHED';
          statusColor = chalk.red;
          details.push(`pid ${lock.pid}`);
          if (health.message) {
            details.push(health.message);
          }
        }
      }

      // Add restart count if > 0
      if (lock && lock.restartCount > 0) {
        details.push(`${lock.restartCount} restart(s)`);
      }

      // Add response time for UP services
      if (status === 'UP' && health.responseTime) {
        details.push(`${health.responseTime}ms`);
      }

      return {
        name: service.name,
        port: service.port,
        rawStatus: status,
        statusStr: statusColor(status),
        details: details.join(', ')
      };
    }));

    // Create enhanced table with lock-based status
    const { default: Table } = await import('cli-table3');
    const table = new Table({
      head: [
        chalk.bold('Service'),
        chalk.bold('Port'),
        chalk.bold('Status'),
        chalk.bold('Details')
      ],
      colWidths: [20, 8, 12, 40],
      style: { head: ['cyan'] }
    });

    tableData.forEach(row => {
      table.push([
        row.name,
        row.port,
        row.statusStr,
        row.details
      ]);
    });

    console.log(table.toString());

    // Summary section
    const upCount = tableData.filter(r => r.rawStatus === 'UP').length;
    const crashedCount = tableData.filter(r => r.rawStatus === 'CRASHED').length;
    const downCount = tableData.filter(r => r.rawStatus === 'DOWN').length;

    console.log('');
    if (upCount === services.length) {
      printSuccess(`All ${upCount} services are running.`);
    } else {
      if (crashedCount > 0) {
        printError(`${crashedCount} service(s) crashed (stale locks detected).`);
        printInfo('Run: forge status --clear-locks to clean up stale locks.');
      }
      if (downCount > 0) {
        printWarning(`${downCount} service(s) are not running.`);
      }
      if (upCount > 0) {
        printInfo(`${upCount} service(s) running.`);
      }
      printInfo('Run: forge dev --with-docs  or  forge docs');
    }

    if (wsl.isWsl2) {
      console.log('');
      printInfo(`WSL2 detected. Host IP: ${wsl.hostIp || 'auto-detected'}`);
      printInfo('Use http://127.0.0.1:<port> or the host IP from Windows browser.');
    }

    // ── Production environment hint ────────────────────────────────────
    if (!options.systemd) {
      const env = await detectEnvironment();
      if (env.hasSystemd && env.hasForgeServices) {
        console.log('');
        printInfo('Production (systemd) environment detected.');
        printInfo('Tip: use forge status --systemd for system-level service status.');
      }
    }

    if (options.watch) {
      console.log('\n' + chalk.gray('Watch mode — refreshing every 5 s. Ctrl+C to stop.'));

      const refresh = async () => {
        const freshLocks = await getAllLocks();
        const freshHealth = await checkMultipleHealth(services.map(s => s.url));

        const freshData = await Promise.all(services.map(async (service, i) => {
          const lock = freshLocks.find(l => l.service === service.key);
          const isValid = lock ? await isLockValid(service.key) : false;
          const health = freshHealth[i];
          let status: 'UP' | 'CRASHED' | 'DOWN';
          if (!lock) {
            status = 'DOWN';
          } else if (!isValid) {
            status = 'CRASHED';
          } else {
            status = health.status === 'up' ? 'UP' : 'CRASHED';
          }
          return { name: service.name, port: service.port, status, pid: lock?.pid, responseTime: health.responseTime };
        }));

        console.clear();
        printHeader('Forge Status (watch)');
        const { default: Table } = await import('cli-table3');
        const tbl = new Table({
          head: [chalk.bold('Service'), chalk.bold('Port'), chalk.bold('Status'), chalk.bold('Details')],
          colWidths: [20, 8, 12, 30],
          style: { head: ['cyan'] },
        });
        freshData.forEach(row => {
          const col = row.status === 'UP' ? chalk.green : row.status === 'CRASHED' ? chalk.red : chalk.gray;
          const details = row.pid
            ? row.status === 'UP'
              ? `pid ${row.pid}${row.responseTime ? ` · ${row.responseTime}ms` : ''}`
              : `stale pid ${row.pid}`
            : '';
          tbl.push([row.name, row.port, col(row.status), details]);
        });
        console.log(tbl.toString());
        console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}`));
      };

      // Run immediately, then on interval
      await refresh();
      const timer = setInterval(() => { void refresh(); }, 5000);

      // Clean up on exit
      process.on('SIGINT', () => {
        clearInterval(timer);
        console.log('\n' + chalk.gray('Watch stopped.'));
        process.exit(0);
      });

      // Keep alive
      await new Promise(() => {/* intentional: stays alive until SIGINT */});
    }
  });

export default program;
