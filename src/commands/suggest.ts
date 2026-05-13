import { Command } from 'commander';
import { printHeader, printSuccess, printWarning, printError, printInfo, printKV, printSection, printPanel, printTable } from '../lib/output.js';
import chalk from 'chalk';

const program = new Command('suggest')
  .description('Analyze Forge ecosystem and suggest improvements')
  .option('--quick', 'Quick scan (health only)')
  .option('--json', 'Output as JSON')
  .action(async (opts: { quick?: boolean; json?: boolean }) => {
    printHeader('Forge Suggest');
    printInfo('Analyzing ecosystem...');
    console.log('');

    const results: Record<string, any> = {};
    const recommendations: string[] = [];

    // ─── 1. Health Check ───
    printSection('Health');
    let healthOk = 0, healthTotal = 0;

    const checks = [
      { name: 'forge.tekup.dk', url: 'https://forge.tekup.dk' },
      { name: 'API', url: 'https://forge.tekup.dk/api/health' },
    ];

    for (const c of checks) {
      healthTotal++;
      try {
        const res = await fetch(c.url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          printSuccess(`${c.name}: UP`);
          healthOk++;
        } else {
          printWarning(`${c.name}: Degraded (${res.status})`);
          recommendations.push(`Check ${c.name} — returned HTTP ${res.status}`);
        }
      } catch {
        printError(`${c.name}: DOWN`);
        recommendations.push(`🚨 ${c.name} is unreachable!`);
      }
    }
    results.health = `${healthOk}/${healthTotal}`;

    // ─── 2. MCP Server ───
    printSection('MCP Server');
    try {
      const mcpRes = await fetch('http://127.0.0.1:8641/health', { signal: AbortSignal.timeout(3000) });
      if (mcpRes.ok) {
        printSuccess('MCP server: running');
        const data = await mcpRes.json().catch(() => ({}));
        if (data.tools) printKV('Tools available', String(data.tools));
        if (data.version) printKV('Version', data.version);
      } else {
        printWarning('MCP server: degraded');
        recommendations.push('Restart MCP server: forge mcp restart');
      }
    } catch {
      printWarning('MCP server: not running');
      recommendations.push('Start MCP server: forge mcp start');
    }

    if (opts.quick) {
      // Quick mode — just show summary
      console.log('');
      if (recommendations.length === 0) {
        printSuccess('All systems nominal ✨');
      } else {
        printSection('Quick Recommendations');
        for (const r of recommendations) {
          console.log('  ' + r);
        }
      }
      return;
    }

    // ─── 3. Packs Analysis ───
    printSection('Packs');
    try {
      const packsRes = await fetch('https://forge.tekup.dk/api/forge/packs?catalog=1&limit=5', {
        signal: AbortSignal.timeout(5000),
      });
      if (packsRes.ok) {
        const data = await packsRes.json();
        const packs = data.packs || data || [];
        printKV('Total packs', String(packs.length || 0));

        // Check for stale packs
        const stale = packs.filter((p: any) => p.status === 'draft' || p.status === 'archived');
        if (stale.length > 0) {
          printWarning(`${stale.length} pack(s) in draft/archived`);
          recommendations.push(`Review ${stale.length} stale packs — consider publishing or cleaning up`);
        }
      } else {
        printWarning('Packs API unavailable');
      }
    } catch {
      printWarning('Packs API unavailable');
    }

    // ─── 4. CLI Version ───
    printSection('CLI');
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { fileURLToPath } = await import('node:url');

    try {
      const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
      printKV('CLI Version', pkg.version);
      printKV('Published', 'GitHub Packages');

      // Check if npm publish needed
      recommendations.push('Publish to npmjs.org for wider distribution');
    } catch { /* ignore */ }

    // ─── 5. Performance ───
    printSection('Performance');
    try {
      const perfRes = await fetch('https://forge.tekup.dk/');
      const serverTiming = perfRes.headers.get('server-timing') || '';
      if (serverTiming) printKV('Server timing', serverTiming);
      printKV('Status', String(perfRes.status));
      if (perfRes.status !== 200) {
        recommendations.push('Check web server — non-200 response');
      }
    } catch { /* ignore */ }

    // ─── Summary ───
    console.log('');
    printSection('Analysis Complete');

    if (recommendations.length === 0) {
      printSuccess('Everything looks good! No recommendations.');
    } else {
      printInfo(`${recommendations.length} recommendation(s):`);
      console.log('');
      recommendations.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r}`);
      });
    }

    if (opts.json) {
      console.log(JSON.stringify({ health: results.health, recommendations }, null, 2));
    }
  });

export default program;
