/**
 * When a dev server is up on a port, "port in use" is expected — suppress that
 * warning if the corresponding HTTP check succeeded (avoids noisy `doctor --strict`).
 */
export function shouldSuppressPortInUseWarning(portIndex, servicesHttp) {
    const keys = ['web', 'api', 'docs', 'mcp'];
    const key = keys[portIndex];
    const raw = servicesHttp[key];
    if (!raw || typeof raw !== 'object')
        return false;
    const svc = raw;
    if (svc.skipped)
        return false;
    if (key === 'api') {
        const health = svc.health;
        const ready = svc.ready;
        if (health?.bodyOk && ready?.bodyOk)
            return true;
        if (health?.bodyOk && ready?.staleReady404)
            return true;
        return false;
    }
    return svc.status === 'up';
}
//# sourceMappingURL=doctorPortWarnings.js.map