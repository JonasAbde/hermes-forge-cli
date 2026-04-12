import { Command } from 'commander';
import { execSync } from 'child_process';
import { printHeader, printSuccess, printError, printWarning, printInfo, box } from '../lib/output.js';
import { detectWsl } from '../lib/wslDetector.js';
import { checkPorts } from '../lib/portChecker.js';
import { config } from '../lib/configManager.js';
import { readFileSync, existsSync } from 'fs';
import { execa } from 'execa';
import { ExitCodes, isCiMode, createCiResponse } from '../lib/ciMode.js';
import { checkHealth, checkForgeApiHealth, checkForgeApiReady } from '../lib/healthCheck.js';
import { resolveRepoRoot, catalogJsonPathForRoot } from '../lib/repoPaths.js';
import { shouldSuppressPortInUseWarning } from '../lib/doctorPortWarnings.js';

const program = new Command('doctor')
  .description('Run comprehensive system diagnostics')
  .option('--strict', 'exit with code 1 on any warning')
  .option('--json', 'output as JSON')
  .option('--quick', 'skip heavy checks')
  .option('--deep', 'run API smokes (smoke-test, smoke-auth; optional smoke-http when API is up)')
  .action(async (options) => {
    const doctorStartedAt = Date.now();

    const jsonOutput = options.json || isCiMode();

    if (!jsonOutput) {
      printHeader('Forge Doctor');
    }

    const issues: string[] = [];
    const warnings: string[] = [];
    const results: Record<string, unknown> = {};

    const nodeVersion = process.version;
    const nodeOk = parseInt(nodeVersion.slice(1), 10) >= 18;
    results.node = { version: nodeVersion, ok: nodeOk };
    if (!jsonOutput) {
      if (nodeOk) printSuccess(`Node.js ${nodeVersion}`);
      else {
        printError(`Node.js ${nodeVersion} (requires >=18)`);
        issues.push('Node version too old');
      }
    }
    if (!nodeOk) issues.push('Node version too old');

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

    const cfg = config.get();
    const portsToCheck = [cfg.ports.web, cfg.ports.api, cfg.ports.docs, cfg.ports.mcp];
    const portResults = await checkPorts(portsToCheck);

    portResults.forEach((p, i) => {
      const names = ['Web', 'API', 'Docs', 'MCP'];
      if (p.isInUse) {
        if (!jsonOutput) printWarning(`Port ${p.port} (${names[i]}) in use by PID ${p.pid}`);
      } else {
        if (!jsonOutput) printSuccess(`Port ${p.port} (${names[i]}) is free`);
      }
    });
    results.ports = portResults;

    const { root: repoRoot, source: repoSource } = resolveRepoRoot();
    const catalogPath = catalogJsonPathForRoot(repoRoot);
    results.repoRoot = { path: repoRoot, source: repoSource };
    let catalogOk = false;
    if (existsSync(catalogPath)) {
      try {
        const content = readFileSync(catalogPath, 'utf8');
        JSON.parse(content);
        catalogOk = true;
        if (!jsonOutput) printSuccess(`catalog.json is valid (${catalogPath})`);
      } catch {
        if (!jsonOutput) printError('catalog.json exists but is invalid JSON');
        issues.push('Invalid catalog.json');
      }
    } else {
      if (!jsonOutput) printWarning(`catalog.json not found at ${catalogPath}`);
      warnings.push('catalog.json missing');
      if (repoSource === 'cwd') {
        warnings.push(
          'Could not locate server/data/catalog.json — run from the monorepo root or set FORGE_REPO_ROOT.'
        );
      }
    }
    results.catalog = { ok: catalogOk, path: catalogPath };

    if (options.deep) {
      const deep: Record<string, unknown> = {};
      try {
        await execa('node', ['server/smoke-test.mjs'], {
          cwd: repoRoot,
          stdio: jsonOutput ? 'pipe' : 'inherit',
        });
        deep.smokeTest = 'ok';
      } catch (e: unknown) {
        const err = e as { stderr?: string; message?: string };
        issues.push('smoke-test.mjs failed');
        deep.smokeTest = 'failed';
        deep.smokeTestError = err.stderr || err.message || String(e);
      }
      try {
        await execa('node', ['server/smoke-auth.mjs'], {
          cwd: repoRoot,
          stdio: jsonOutput ? 'pipe' : 'inherit',
        });
        deep.smokeAuth = 'ok';
      } catch (e: unknown) {
        const err = e as { stderr?: string; message?: string };
        issues.push('smoke-auth.mjs failed');
        deep.smokeAuth = 'failed';
        deep.smokeAuthError = err.stderr || err.message || String(e);
      }
      const smokeHttpBase =
        process.env.FORGE_SMOKE_HTTP_BASE?.trim() ||
        (portResults[1]?.isInUse ? `http://127.0.0.1:${cfg.ports.api}` : '');
      if (smokeHttpBase) {
        try {
          await execa('node', ['server/smoke-http.mjs'], {
            cwd: repoRoot,
            env: { ...process.env, FORGE_SMOKE_HTTP_BASE: smokeHttpBase },
            stdio: jsonOutput ? 'pipe' : 'inherit',
          });
          deep.smokeHttp = 'ok';
          deep.smokeHttpBase = smokeHttpBase;
        } catch (e: unknown) {
          const err = e as { stderr?: string; message?: string };
          warnings.push('smoke-http.mjs failed (is the Forge API running and ready?)');
          deep.smokeHttp = 'failed';
          deep.smokeHttpError = err.stderr || err.message || String(e);
        }
      } else {
        deep.smokeHttp = 'skipped';
        deep.smokeHttpReason = 'set FORGE_SMOKE_HTTP_BASE or start API on configured port';
      }
      results.deep = deep;
    } else {
      results.deep = { skipped: true };
    }

    const proxyEnv = process.env.FORGE_API_PROXY;
    const proxyOn = proxyEnv === '1' || proxyEnv === 'true';
    results.forgeApiProxy = { set: proxyOn, value: proxyEnv ?? null };
    const allowOn = process.env.FORGE_ALLOW_PROXY === '1' || process.env.FORGE_ALLOW_PROXY === 'true';
    results.forgeAllowProxy = { set: allowOn };
    if (proxyOn && !allowOn) {
      warnings.push(
        'FORGE_API_PROXY is set without FORGE_ALLOW_PROXY=1 — Vite uses embedded catalog (proxy ignored). Add FORGE_ALLOW_PROXY=1 only if you intentionally proxy /api to 5181.'
      );
      if (!jsonOutput) {
        printWarning(
          'FORGE_API_PROXY without FORGE_ALLOW_PROXY → embedded catalog (see web/.env.example).'
        );
      }
    } else if (proxyOn && allowOn) {
      warnings.push(
        'FORGE_API_PROXY + FORGE_ALLOW_PROXY: /api is proxied to 5181 — ensure Forge API is running.'
      );
      if (!jsonOutput) {
        printWarning('API proxy active → ensure standalone Forge API is up on port 5181.');
      }
    }

    const webPortInfo = portResults[0];
    if (!options.quick && webPortInfo?.isInUse) {
      const catalogUrl = `http://127.0.0.1:${cfg.ports.web}/api/forge/packs?catalog=1&sort=trust-desc`;
      try {
        const ac = new AbortController();
        const t = setTimeout(() => ac.abort(), 4000);
        const res = await fetch(catalogUrl, { signal: ac.signal });
        clearTimeout(t);
        if (res.ok) {
          const body = (await res.json()) as { packs?: unknown[] };
          const n = Array.isArray(body.packs) ? body.packs.length : 0;
          results.catalogHttp = { ok: true, url: catalogUrl, packCount: n };
          if (!jsonOutput) printSuccess(`Catalog API reachable (${n} packs) on port ${cfg.ports.web}`);
        } else {
          results.catalogHttp = { ok: false, url: catalogUrl, status: res.status };
          warnings.push(`Catalog HTTP ${res.status} on port ${cfg.ports.web}`);
          if (!jsonOutput) printWarning(`Catalog API returned HTTP ${res.status} — check FORGE_API_PROXY and API on 5181.`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        results.catalogHttp = { ok: false, url: catalogUrl, error: msg };
        warnings.push(`Catalog fetch failed on port ${cfg.ports.web}: ${msg}`);
        if (!jsonOutput) printWarning(`Could not fetch catalog on :${cfg.ports.web} — is Vite running?`);
      }
    } else if (!options.quick && !webPortInfo?.isInUse) {
      results.catalogHttp = { skipped: true, reason: 'web port not in use' };
    }

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

    const servicesHttp: Record<string, unknown> = {};
    if (!options.quick) {
      const defs = [
        {
          key: 'web',
          name: 'Web (Vite)',
          portIndex: 0,
          url: `http://127.0.0.1:${cfg.ports.web}`,
          kind: 'http' as const,
        },
        {
          key: 'api',
          name: 'API',
          portIndex: 1,
          url: `http://127.0.0.1:${cfg.ports.api}`,
          kind: 'forgeApi' as const,
        },
        {
          key: 'docs',
          name: 'Docs (VitePress)',
          portIndex: 2,
          url: `http://127.0.0.1:${cfg.ports.docs}`,
          kind: 'http' as const,
        },
        {
          key: 'mcp',
          name: 'MCP Registry',
          portIndex: 3,
          url: `http://127.0.0.1:${cfg.ports.mcp}/health`,
          kind: 'http' as const,
        },
      ];

      for (const def of defs) {
        const pr = portResults[def.portIndex];
        if (!pr?.isInUse) {
          servicesHttp[def.key] = { skipped: true, reason: 'port not in use' };
          continue;
        }

        if (def.kind === 'forgeApi') {
          const health = await checkForgeApiHealth(def.url);
          const ready = await checkForgeApiReady(def.url);
          const staleReady404 = !!(health.bodyOk && !ready.bodyOk && ready.httpStatus === 404);
          const readyPayload = staleReady404
            ? {
                ...ready,
                staleReady404: true as const,
                note:
                  'GET /ready returned HTTP 404 while /health is OK — this process likely predates the /ready route; restart with `npm run dev:api`.',
              }
            : ready;
          servicesHttp[def.key] = { health, ready: readyPayload };
          if (!health.bodyOk) {
            const detail = health.message || 'forge_db or catalog not ok';
            if (health.status === 'error') {
              warnings.push(`API /health: ${detail}`);
            } else {
              warnings.push(`API /health degraded: ${detail}`);
            }
          }
          if (!ready.bodyOk && !staleReady404) {
            const detail = ready.message || 'readiness check failed';
            if (ready.status === 'error') {
              warnings.push(`API /ready: ${detail}`);
            } else {
              warnings.push(`API not ready: ${detail}`);
            }
          }
          if (!jsonOutput) {
            if (health.bodyOk) {
              printSuccess(`${def.name}: /health OK (forge_db=${health.forge_db}, catalog=${health.catalog})`);
            } else {
              printWarning(`${def.name} /health: ${health.message || 'failed'}`);
            }
            if (ready.bodyOk) {
              printSuccess(
                `${def.name}: /ready OK (sqlite_query=${ready.checks?.sqlite_query}, catalog=${ready.checks?.catalog})`
              );
            } else if (staleReady404) {
              printInfo(
                `${def.name}: /ready is missing (HTTP 404) while /health is OK — restart API to pick up GET /ready.`
              );
            } else {
              printWarning(`${def.name} /ready: ${ready.message || 'not ready'}`);
            }
          }
        } else {
          const h = await checkHealth(def.url);
          servicesHttp[def.key] = h;
          if (h.status !== 'up') {
            warnings.push(`${def.name} HTTP ${h.status}${h.message ? `: ${h.message}` : ''}`);
          }
          if (!jsonOutput) {
            if (h.status === 'up') {
              printSuccess(`${def.name}: reachable (${h.responseTime}ms)`);
            } else {
              printWarning(`${def.name}: not reachable (${h.message || h.status})`);
            }
          }
        }
      }
    } else {
      servicesHttp.note = 'skipped (--quick)';
    }

    const portServiceLabels = ['Web', 'API', 'Docs', 'MCP'];
    portResults.forEach((p, i) => {
      if (!p.isInUse) return;
      if (shouldSuppressPortInUseWarning(i, servicesHttp)) return;
      warnings.push(`Port ${p.port} (${portServiceLabels[i]}) in use`);
    });

    if (!options.quick && proxyOn && allowOn) {
      const apiPortFree = !portResults[1]?.isInUse;
      const apiSvc = servicesHttp.api as
        | {
            skipped?: boolean;
            health?: { bodyOk?: boolean };
            ready?: { bodyOk?: boolean; staleReady404?: boolean };
          }
        | undefined;
      let apiUnhealthy = apiPortFree;
      if (!apiUnhealthy && apiSvc && !apiSvc.skipped) {
        const h = apiSvc.health?.bodyOk;
        const r = apiSvc.ready?.bodyOk;
        const stale = apiSvc.ready?.staleReady404;
        if (h !== undefined && r !== undefined) {
          apiUnhealthy = stale ? false : h === false || r === false;
        }
      }
      if (apiUnhealthy) {
        const w =
          'Proxy mode (FORGE_API_PROXY + FORGE_ALLOW_PROXY): standalone API on 5181 is required but not healthy. Start `npm run dev:api`, use `npm run dev:wait-api` to start web after /ready, or unset FORGE_ALLOW_PROXY to use Vite embedded catalog.';
        warnings.push(w);
        if (!jsonOutput) printWarning(w);
      }
    }

    results.servicesHttp = servicesHttp;
    results.durationMs = Date.now() - doctorStartedAt;

    const hasErrors = issues.length > 0;
    const hasWarnings = warnings.length > 0;
    const isHealthy = !hasErrors && !hasWarnings;

    let exitCode: number = ExitCodes.SUCCESS;
    if (hasErrors) {
      exitCode = ExitCodes.CONFIG_ERROR;
    } else if (options.strict && hasWarnings) {
      exitCode = ExitCodes.GENERAL_ERROR;
    }

    if (jsonOutput) {
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
            warningDetails: warnings,
          },
        },
        hasErrors ? { message: issues.join(', '), code: 'CHECKS_FAILED' } : undefined
      );

      console.log(JSON.stringify(response, null, 2));
    } else {
      console.log('\n');
      if (isHealthy) {
        printSuccess('All checks passed. System is healthy.');
      } else {
        if (hasErrors) {
          printError(`${issues.length} critical issue(s) found:`);
          issues.forEach((i) => printError(`  • ${i}`));
        }
        if (hasWarnings) {
          printWarning(`${warnings.length} warning(s) found:`);
          warnings.forEach((w) => printWarning(`  • ${w}`));
        }
      }

      box(`Summary: ${issues.length} errors, ${warnings.length} warnings`, 'Doctor Report');
    }

    process.exit(exitCode);
  });

export default program;
