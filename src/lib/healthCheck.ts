export interface HealthResult {
  url: string;
  status: 'up' | 'down' | 'error';
  responseTime?: number;
  message?: string;
}

function describeHealthError(error: unknown): string {
  if (error instanceof Error) {
    return error.name === 'AbortError' ? 'timeout' : error.message;
  }
  return String(error);
}

/** Forge API GET /health JSON shape (see server/forge-api-core.mjs). */
export interface ForgeApiHealthResult {
  url: string;
  status: 'up' | 'down' | 'error';
  responseTime?: number;
  message?: string;
  /** True when status, forge_db, and catalog are all ok. */
  bodyOk: boolean;
  apiStatus?: string;
  forge_db?: 'ok' | 'error';
  catalog?: 'ok' | 'error';
  service?: string;
}

/**
 * Lightweight HTTP reachability check. Uses GET (not HEAD): Forge API and many dev
 * servers do not treat HEAD /health the same as GET, which caused false negatives.
 */
export async function checkHealth(url: string, timeoutMs = 2000): Promise<HealthResult> {
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
    } catch {
      // ignore body read errors
    }

    return {
      url,
      status: response.ok ? 'up' : 'down',
      responseTime,
    };
  } catch (error: unknown) {
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
export async function checkForgeApiHealth(
  baseUrl: string,
  timeoutMs = 4000
): Promise<ForgeApiHealthResult> {
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

    let data: {
      status?: string;
      forge_db?: string;
      catalog?: string;
      service?: string;
    };
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
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
  } catch (error: unknown) {
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

/** GET /ready JSON (server/forge-api-core.mjs). */
export interface ForgeApiReadyResult {
  url: string;
  status: 'up' | 'down' | 'error';
  httpStatus?: number;
  responseTime?: number;
  message?: string;
  /** True when HTTP 200 and body.ready === true. */
  bodyOk: boolean;
  ready?: boolean;
  apiStatus?: string;
  checks?: {
    forge_db?: 'ok' | 'error';
    sqlite_query?: 'ok' | 'error';
    catalog?: 'ok' | 'error';
  };
  service?: string;
  timestamp?: string;
}

/**
 * GET /ready — strict readiness (503 when not ready).
 */
export async function checkForgeApiReady(
  baseUrl: string,
  timeoutMs = 4000
): Promise<ForgeApiReadyResult> {
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

    let data: {
      status?: string;
      ready?: boolean;
      service?: string;
      timestamp?: string;
      checks?: ForgeApiReadyResult['checks'];
    };
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      return {
        url,
        status: 'error',
        httpStatus,
        responseTime,
        bodyOk: false,
        message: 'invalid JSON',
      };
    }

    const bodyOk =
      response.ok && data.ready === true && data.status === 'ok' && httpStatus === 200;

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
  } catch (error: unknown) {
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

export async function checkMultipleHealth(urls: string[], timeoutMs = 2000): Promise<HealthResult[]> {
  const checks = urls.map(url => checkHealth(url, timeoutMs));
  return Promise.all(checks);
}
