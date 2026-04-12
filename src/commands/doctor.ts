import { Command } from 'commander';
import { execSync } from 'child_process';
import { printHeader, printSuccess, printError, printWarning, printInfo, box } from '../lib/output.js';
import { detectWsl } from '../lib/wslDetector.js';
import { checkPorts } from '../lib/portChecker.js';
import { config } from '../lib/configManager.js';
import { readFileSync, existsSync } from 'fs';
import { ExitCodes, isCiMode, createCiResponse } from '../lib/ciMode.js';

const program = new Command('doctor')
  .description('Run comprehensive system diagnostics')
  .option('--strict', 'exit with code 1 on any warning')
  .option('--json', 'output as JSON')
  .option('--quick', 'skip heavy checks')
  .action(async (options) => {
    const startTime = Date.now();
    
    // In CI mode, automatically enable JSON output
    const jsonOutput = options.json || isCiMode();
    
    if (!jsonOutput) {
      printHeader('Forge Doctor');
    }

    const issues: string[] = [];
    const warnings: string[] = [];
    const results: any = {};

    // 1. Node version
    const nodeVersion = process.version;
    const nodeOk = parseInt(nodeVersion.slice(1)) >= 18;
    results.node = { version: nodeVersion, ok: nodeOk };
    if (!jsonOutput) {
      if (nodeOk) printSuccess(`Node.js ${nodeVersion}`);
      else {
        printError(`Node.js ${nodeVersion} (requires >=18)`);
        issues.push('Node version too old');
      }
    }
    if (!nodeOk) issues.push('Node version too old');

    // 2. uv (for MCP)
    let uvOk = false;
    try {
      execSync('uv --version', { stdio: 'ignore' });
      uvOk = true;
      if (!jsonOutput) printSuccess('uv (Python package manager) found');
    } catch {
      warnings.push('uv not found (needed for MCP registry)');
      if (!jsonOutput) printWarning('uv not found → recommended for MCP registry');
    }
    results.uv = { ok: uvOk };

    // 3. Ports
    const cfg = config.get();
    const portsToCheck = [cfg.ports.web, cfg.ports.api, cfg.ports.docs, cfg.ports.mcp];
    const portResults = await checkPorts(portsToCheck);
    
    portResults.forEach((p, i) => {
      const names = ['Web', 'API', 'Docs', 'MCP'];
      if (p.isInUse) {
        if (!jsonOutput) printWarning(`Port ${p.port} (${names[i]}) in use by PID ${p.pid}`);
        warnings.push(`Port ${p.port} (${names[i]}) in use`);
      } else {
        if (!jsonOutput) printSuccess(`Port ${p.port} (${names[i]}) is free`);
      }
    });
    results.ports = portResults;

    // 4. catalog.json
    const catalogPath = 'server/data/catalog.json';
    let catalogOk = false;
    if (existsSync(catalogPath)) {
      try {
        const content = readFileSync(catalogPath, 'utf8');
        JSON.parse(content);
        catalogOk = true;
        if (!jsonOutput) printSuccess('catalog.json is valid');
      } catch {
        if (!jsonOutput) printError('catalog.json exists but is invalid JSON');
        issues.push('Invalid catalog.json');
      }
    } else {
      if (!jsonOutput) printWarning('catalog.json not found (expected at server/data/catalog.json)');
      warnings.push('catalog.json missing');
    }
    results.catalog = { ok: catalogOk, path: catalogPath };

    // 5. WSL2
    const wsl = detectWsl();
    if (!jsonOutput) {
      if (wsl.isWsl2) {
        printInfo(`WSL2 detected. Host IP: ${wsl.hostIp || 'auto-detected via resolv.conf'}`);
        printInfo('Use 127.0.0.1 or host IP from Windows browser.');
      } else if (wsl.isWsl) {
        printInfo('WSL1 detected - consider upgrading to WSL2 for better performance.');
      }
    }
    results.wsl = wsl;

    // Summary
    const hasErrors = issues.length > 0;
    const hasWarnings = warnings.length > 0;
    const isHealthy = !hasErrors && !hasWarnings;
    
    // Determine exit code
    let exitCode: number = ExitCodes.SUCCESS;
    if (hasErrors) {
      exitCode = ExitCodes.CONFIG_ERROR;
    } else if (options.strict && hasWarnings) {
      exitCode = ExitCodes.GENERAL_ERROR;
    }

    if (jsonOutput) {
      // JSON output mode
      const response = createCiResponse(
        exitCode === ExitCodes.SUCCESS,
        exitCode,
        {
          healthy: isHealthy,
          checks: results,
          summary: {
            errors: issues.length,
            warnings: warnings.length,
            errorDetails: issues,
            warningDetails: warnings
          }
        },
        hasErrors ? { message: issues.join(', '), code: 'CHECKS_FAILED' } : undefined
      );
      
      console.log(JSON.stringify(response, null, 2));
    } else {
      // Interactive output mode
      console.log('\n');
      if (isHealthy) {
        printSuccess('All checks passed. System is healthy.');
      } else {
        if (hasErrors) {
          printError(`${issues.length} critical issue(s) found:`);
          issues.forEach(i => printError(`  • ${i}`));
        }
        if (hasWarnings) {
          printWarning(`${warnings.length} warning(s) found:`);
          warnings.forEach(w => printWarning(`  • ${w}`));
        }
      }

      box(`Summary: ${issues.length} errors, ${warnings.length} warnings`, 'Doctor Report');
    }

    process.exit(exitCode);
  });

export default program;
