/**
 * When a dev server is up on a port, "port in use" is expected — suppress that
 * warning if the corresponding HTTP check succeeded (avoids noisy `doctor --strict`).
 */
export function shouldSuppressPortInUseWarning(
  portIndex: number,
  servicesHttp: Record<string, unknown>
): boolean {
  const keys = ['web', 'api', 'docs', 'mcp'] as const;
  const key = keys[portIndex];
  const raw = servicesHttp[key];
  if (!raw || typeof raw !== 'object') return false;
  const svc = raw as Record<string, unknown>;
  if (svc.skipped) return false;

  if (key === 'api') {
    const health = svc.health as { bodyOk?: boolean } | undefined;
    const ready = svc.ready as { bodyOk?: boolean; staleReady404?: boolean } | undefined;
    if (health?.bodyOk && ready?.bodyOk) return true;
    if (health?.bodyOk && ready?.staleReady404) return true;
    return false;
  }

  return svc.status === 'up';
}
