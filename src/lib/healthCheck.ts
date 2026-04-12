export interface HealthResult {
  url: string;
  status: 'up' | 'down' | 'error';
  responseTime?: number;
  message?: string;
}

export async function checkHealth(url: string, timeoutMs = 2000): Promise<HealthResult> {
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
  } catch (error: any) {
    const responseTime = Date.now() - start;
    return {
      url,
      status: 'error',
      responseTime,
      message: error.name === 'AbortError' ? 'timeout' : error.message,
    };
  }
}

export async function checkMultipleHealth(urls: string[], timeoutMs = 2000): Promise<HealthResult[]> {
  const checks = urls.map(url => checkHealth(url, timeoutMs));
  return Promise.all(checks);
}
