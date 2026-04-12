/**
 * Interactive prompts for Forge CLI
 */
export declare function interactiveDev(): Promise<{
    mode: any;
    withDocs: boolean;
    portOffset: any;
}>;
export declare function interactiveInit(): Promise<{
    template: any;
    projectName: any;
    directory: any;
}>;
export declare function interactivePluginInstall(): Promise<{
    source: any;
    global: any;
}>;
export declare function interactiveScheduleAdd(): Promise<{
    name: any;
    schedule: any;
    command: any;
}>;
export declare function interactiveWorkspaceSwitch(): Promise<any>;
export declare function interactiveMainMenu(): Promise<any>;
export declare function confirm(message: string): Promise<any>;
//# sourceMappingURL=interactive.d.ts.map