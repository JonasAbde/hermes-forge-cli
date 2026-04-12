export interface WslInfo {
    isWsl: boolean;
    isWsl2: boolean;
    hostIp: string | null;
    openCommand: (url: string) => string[];
}
export declare function detectWsl(): WslInfo;
//# sourceMappingURL=wslDetector.d.ts.map