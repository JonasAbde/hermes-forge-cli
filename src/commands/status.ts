import { Command } from 'commander';
import chalk from 'chalk';
import { checkMultipleHealth } from '../lib/healthCheck.js';
import { detectWsl } from '../lib/wslDetector.js';
import { printHeader, printInfo, printWarning, printSuccess, printError } from '../lib/output.js';
import { config } from '../lib/configManager.js';
import { 
  getAllLocks, 
  isLockValid, 
  clearStaleLocks
} from '../lib/lockManager.js';

const program = new Command('status')
  .description('Show status of all Forge services')
  .option('--watch', 'watch mode - refresh every 5 seconds')
  .option('--json', 'output as JSON')
  .option('--clear-locks', 'clear stale lock files for dead processes')
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

    const services = [
      { key: 'web', name: 'Web (Vite)', port: cfg.ports.web, url: `http://127.0.0.1:${cfg.ports.web}` },
      { key: 'api', name: 'API', port: cfg.ports.api, url: `http://127.0.0.1:${cfg.ports.api}/health` },
      { key: 'docs', name: 'Docs (VitePress)', port: cfg.ports.docs, url: `http://127.0.0.1:${cfg.ports.docs}` },
      { key: 'mcp', name: 'MCP Registry', port: cfg.ports.mcp, url: `http://127.0.0.1:${cfg.ports.mcp}/health` }
    ];

    const wsl = detectWsl();

    // Get all locks and check validity
    const allLocks = await getAllLocks();
    const lockMap = new Map(allLocks.map(lock => [lock.service, lock.service]));

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
      let details: string[] = [];

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
