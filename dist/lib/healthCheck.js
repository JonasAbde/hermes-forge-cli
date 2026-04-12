function describeHealthError(error) {
    if (error instanceof Error) {
        return error.name === 'AbortError' ? 'timeout' : error.message;
    }
    return String(error);
}
/**
 * Lightweight HTTP reachability check. Uses GET (not HEAD): Forge API and many dev
 * servers do not treat HEAD /health the same as GET, which caused false negatives.
 */
export async function checkHealth(url, timeoutMs = 2000) {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            redirect: 'manual',
        });
        clearTimeout(timeout);
        const responseTime = Date.now() - start;
        try {
            await response.arrayBuffer();
        }
        catch {
            // ignore body read errors
        }
        return {
            url,
            status: response.ok ? 'up' : 'down',
            responseTime,
        };
    }
    catch (error) {
        const responseTime = Date.now() - start;
        return {
            url,
            status: 'error',
            responseTime,
            message: describeHealthError(error),
        };
    }
}
/**
 * GET /health on the Forge API and validate JSON (DB + catalog file probes).
 */
export async function checkForgeApiHealth(baseUrl, timeoutMs = 4000) {
    const base = baseUrl.replace(/\/$/, '');
    const url = base.endsWith('/health') ? base : `${base}/health`;
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            redirect: 'manual',
        });
        clearTimeout(timeout);
        const responseTime = Date.now() - start;
        const text = await response.text();
        if (!response.ok) {
            return {
                url,
                status: 'down',
                responseTime,
                bodyOk: false,
                message: `HTTP ${response.status}`,
            };
        }
        let data;
        try {
            data = JSON.parse(text);
        }
        catch {
            return {
                url,
                status: 'error',
                responseTime,
                bodyOk: false,
                message: 'invalid JSON',
            };
        }
        const forge_db = data.forge_db === 'ok' || data.forge_db === 'error' ? data.forge_db : undefined;
        const catalog = data.catalog === 'ok' || data.catalog === 'error' ? data.catalog : undefined;
        const bodyOk = data.status === 'ok' && forge_db === 'ok' && catalog === 'ok';
        return {
            url,
            status: bodyOk ? 'up' : 'down',
            responseTime,
            bodyOk,
            apiStatus: data.status,
            forge_db,
            catalog,
            service: data.service,
            message: bodyOk
                ? undefined
                : `status=${data.status}, forge_db=${data.forge_db}, catalog=${data.catalog}`,
        };
    }
    catch (error) {
        const responseTime = Date.now() - start;
        return {
            url: base.endsWith('/health') ? base : `${base}/health`,
            status: 'error',
            responseTime,
            bodyOk: false,
            message: describeHealthError(error),
        };
    }
}
/**
 * GET /ready — strict readiness (503 when not ready).
 */
export async function checkForgeApiReady(baseUrl, timeoutMs = 4000) {
    const base = baseUrl.replace(/\/$/, '');
    const url = base.endsWith('/ready') ? base : `${base}/ready`;
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            redirect: 'manual',
        });
        clearTimeout(timeout);
        const responseTime = Date.now() - start;
        const text = await response.text();
        const httpStatus = response.status;
        let data;
        try {
            data = JSON.parse(text);
        }
        catch {
            return {
                url,
                status: 'error',
                httpStatus,
                responseTime,
                bodyOk: false,
                message: 'invalid JSON',
            };
        }
        const bodyOk = response.ok && data.ready === true && data.status === 'ok' && httpStatus === 200;
        return {
            url,
            status: bodyOk ? 'up' : 'down',
            httpStatus,
            responseTime,
            bodyOk,
            ready: data.ready,
            apiStatus: data.status,
            checks: data.checks,
            service: data.service,
            timestamp: data.timestamp,
            message: bodyOk
                ? undefined
                : `HTTP ${httpStatus}, ready=${data.ready}, checks=${JSON.stringify(data.checks)}`,
        };
    }
    catch (error) {
        const responseTime = Date.now() - start;
        return {
            url: base.endsWith('/ready') ? base : `${base}/ready`,
            status: 'error',
            responseTime,
            bodyOk: false,
            message: describeHealthError(error),
        };
    }
}
export async function checkMultipleHealth(urls, timeoutMs = 2000) {
    const checks = urls.map(url => checkHealth(url, timeoutMs));
    return Promise.all(checks);
}
//# sourceMappingURL=healthCheck.js.map