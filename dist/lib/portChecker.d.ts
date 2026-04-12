export interface PortInfo {
    port: number;
    isInUse: boolean;
    pid?: number;
    command?: string;
}
export declare function checkPort(port: number): Promise<PortInfo>;
export declare function checkPorts(ports: number[]): Promise<PortInfo[]>;
//# sourceMappingURL=portChecker.d.ts.map