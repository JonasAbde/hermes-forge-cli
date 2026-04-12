export type RepoRootSource = 'env' | 'walk' | 'cwd';
/**
 * Resolve monorepo root so `server/data/catalog.json` exists.
 * Set FORGE_REPO_ROOT to override.
 */
export declare function resolveRepoRoot(): {
    root: string;
    source: RepoRootSource;
};
export declare function catalogJsonPathForRoot(root: string): string;
//# sourceMappingURL=repoPaths.d.ts.map