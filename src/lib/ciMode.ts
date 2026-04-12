// CI Mode helpers for Forge CLI
// Ensures consistent JSON output and exit codes for CI/CD pipelines

import chalk from 'chalk';

type ForgeGlobal = typeof globalThis & {
  __FORGE_CLI_START_TIME?: number;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}

// Exit codes based on sysexits.h + CLI-specific codes
export const ExitCodes = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  MISUSE_OF_SHELL_BUILTINS: 2,
  CONFIG_ERROR: 3,
  PORT_CONFLICT: 4,
  SERVICE_TIMEOUT: 5,
  VALIDATION_FAILED: 6,
  AUDIT_CRITICAL: 7,
  BUILD_FAILED: 8,
  TEST_FAILED: 9,
  NOT_FOUND: 10,
  PERMISSION_DENIED: 11
} as const;

export type ExitCode = typeof ExitCodes[keyof typeof ExitCodes];

// Check if running in CI mode (no TTY, or CI env var set)
export function isCiMode(): boolean {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    !process.stdout.isTTY ||
    process.env.FORGE_CI_MODE
  );
}

// Strip ANSI codes for CI mode
function stripAnsiCodes(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

// CI-safe output - disables chalk colors in CI mode
export function ciOutput(data: unknown): string {
  if (isCiMode()) {
    // Strip ANSI codes for CI
    return stripAnsiCodes(JSON.stringify(data, null, 2));
  }
  return JSON.stringify(data, null, 2);
}

// Standard CI response format
export interface CiResponse<T = unknown> {
  success: boolean;
  timestamp: string;
  exitCode: number;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
  metadata?: {
    command: string;
    args: string[];
    duration?: number;
    version: string;
  };
}

// Create a standard CI response
export function createCiResponse<T>(
  success: boolean,
  exitCode: number,
  data?: T,
  error?: { message: string; code: string; details?: unknown }
): CiResponse<T> {
  const forgeGlobal = globalThis as ForgeGlobal;
  const startTime = forgeGlobal.__FORGE_CLI_START_TIME || Date.now();
  const duration = Date.now() - startTime;
  
  return {
    success,
    timestamp: new Date().toISOString(),
    exitCode,
    data,
    error,
    metadata: {
      command: process.argv[2] || 'unknown',
      args: process.argv.slice(3),
      duration,
      version: process.env.npm_package_version || '0.1.0'
    }
  };
}

// Print CI response and exit
export function printAndExit<T>(
  success: boolean,
  exitCode: number,
  data?: T,
  error?: { message: string; code: string; details?: unknown }
): never {
  const response = createCiResponse(success, exitCode, data, error);
  
  if (isCiMode()) {
    // In CI mode, only output valid JSON to stdout
    console.log(JSON.stringify(response));
  } else {
    // In interactive mode, also show human-readable output
    if (success) {
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    } else {
      console.error(error?.message || 'Unknown error');
    }
  }
  
  process.exit(exitCode);
}

// Wrapper for commands to ensure proper exit codes
export async function runWithExitCode<T>(
  fn: () => Promise<{ success: boolean; data?: T; error?: string }>,
  successCode: number = ExitCodes.SUCCESS,
  errorCode: number = ExitCodes.GENERAL_ERROR
): Promise<never> {
  const startTime = Date.now();
  const forgeGlobal = globalThis as ForgeGlobal;
  forgeGlobal.__FORGE_CLI_START_TIME = startTime;
  
  try {
    const result = await fn();
    
    if (result.success) {
      printAndExit(true, successCode, result.data);
    } else {
      printAndExit(false, errorCode, undefined, {
        message: result.error || 'Command failed',
        code: 'COMMAND_FAILED'
      });
    }
  } catch (error: unknown) {
    printAndExit(false, errorCode, undefined, {
      message: getErrorMessage(error, 'Unexpected error'),
      code: 'UNEXPECTED_ERROR',
      details: getErrorStack(error)
    });
  }
}

// Environment detection for CI services
export function detectCiService(): string | null {
  if (process.env.GITHUB_ACTIONS) return 'github-actions';
  if (process.env.GITLAB_CI) return 'gitlab-ci';
  if (process.env.CIRCLECI) return 'circle-ci';
  if (process.env.TRAVIS) return 'travis';
  if (process.env.JENKINS_URL) return 'jenkins';
  if (process.env.AZURE_PIPELINES) return 'azure-pipelines';
  if (process.env.BITBUCKET_PIPELINE_UUID) return 'bitbucket-pipelines';
  return null;
}

// Add CI environment info to metadata
export function getCiEnvironment(): Record<string, unknown> {
  const ciService = detectCiService();
  
  if (!ciService) {
    return { ci: false };
  }
  
  return {
    ci: true,
    service: ciService,
    // Include common CI environment variables
    branch: process.env.GITHUB_REF || process.env.GITLAB_BRANCH || process.env.CIRCLE_BRANCH,
    commit: process.env.GITHUB_SHA || process.env.GITLAB_COMMIT || process.env.CIRCLE_SHA1,
    buildId: process.env.GITHUB_RUN_ID || process.env.GITLAB_PIPELINE_ID || process.env.CIRCLE_BUILD_NUM,
    job: process.env.GITHUB_JOB || process.env.CIRCLE_JOB
  };
}
