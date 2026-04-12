/**
 * When a dev server is up on a port, "port in use" is expected — suppress that
 * warning if the corresponding HTTP check succeeded (avoids noisy `doctor --strict`).
 */
export declare function shouldSuppressPortInUseWarning(portIndex: number, servicesHttp: Record<string, unknown>): boolean;
//# sourceMappingURL=doctorPortWarnings.d.ts.map