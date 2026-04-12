export async function checkHealth(url, timeoutMs = 2000) {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
        });
        clearTimeout(timeout);
        const responseTime = Date.now() - start;
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
            message: error.name === 'AbortError' ? 'timeout' : error.message,
        };
    }
}
export async function checkMultipleHealth(urls, timeoutMs = 2000) {
    const checks = urls.map(url => checkHealth(url, timeoutMs));
    return Promise.all(checks);
}
//# sourceMappingURL=healthCheck.js.map