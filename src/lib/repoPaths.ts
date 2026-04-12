import { existsSync } from 'fs';
import { join, resolve } from 'path';

const CATALOG_REL = join('server', 'data', 'catalog.json');

export type RepoRootSource = 'env' | 'walk' | 'cwd';

/**
 * Resolve monorepo root so `server/data/catalog.json` exists.
 * Set FORGE_REPO_ROOT to override.
 */
export function resolveRepoRoot(): { root: string; source: RepoRootSource } {
  const env = process.env.FORGE_REPO_ROOT?.trim();
  if (env) {
    const r = resolve(env);
    if (existsSync(join(r, CATALOG_REL))) {
      return { root: r, source: 'env' };
    }
  }
  let dir = resolve(process.cwd());
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, CATALOG_REL))) {
      return { root: dir, source: 'walk' };
    }
    const parent = join(dir, '..');
    if (parent === dir) break;
    dir = resolve(parent);
  }
  return { root: resolve(process.cwd()), source: 'cwd' };
}

export function catalogJsonPathForRoot(root: string): string {
  return join(root, CATALOG_REL);
}
