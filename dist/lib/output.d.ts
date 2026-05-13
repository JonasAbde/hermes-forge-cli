import { renderLogo, label } from '../brand/index.js';
export declare const spinner: import("ora").Ora;
/** ─── Header ─── */
export declare function printHeader(title?: string): void;
export declare function printSection(title: string): void;
/** ─── Status messages ─── */
export declare function printSuccess(text: string): void;
export declare function printError(text: string): void;
export declare function printWarning(text: string): void;
export declare function printInfo(text: string): void;
/** ─── Key-Value ─── */
export declare function printKV(key: string, value: string): void;
/** ─── Panel ─── */
export declare function printPanel(lines: string[], opts?: {
    title?: string;
}): void;
/** ─── Tables ─── */
export declare function createServiceTable(data: Array<{
    name: string;
    port: number;
    status: string;
    url?: string;
    message?: string;
}>): void;
/** ─── Custom table ─── */
export declare function printTable(headers: string[], rows: string[][]): void;
/** ─── Metrics ─── */
export declare function printMetricRow(metrics: {
    label: string;
    value: string;
    color?: string;
}[], cols?: number): void;
/** ─── Progress ─── */
export declare function printProgress(current: number, total: number, width?: number): void;
/** ─── Box ─── */
export declare function box(text: string, title?: string): void;
/** ─── Compact footer — shows after commands ─── */
export declare function printFooter(): void;
/** ─── Legacy alias ─── */
export { renderLogo as printLogo, label as printLabel };
//# sourceMappingURL=output.d.ts.map