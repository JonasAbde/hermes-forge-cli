/**
 * Multi-workspace management for Forge CLI
 * Manage multiple projects and switch between them
 */
import { writeFile, readFile, mkdir, readdir, access } from 'fs/promises';
import { join, basename, resolve } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { execa } from 'execa';
const WORKSPACE_DIR = join(homedir(), '.forge', 'workspaces');
const WORKSPACES_FILE = join(WORKSPACE_DIR, 'workspaces.json');
// Ensure directories exist
async function ensureDirectories() {
    await mkdir(WORKSPACE_DIR, { recursive: true });
}
// Load all workspaces
export async function loadWorkspaces() {
    await ensureDirectories();
    try {
        const content = await readFile(WORKSPACES_FILE, 'utf8');
        return JSON.parse(content);
    }
    catch {
        return [];
    }
}
// Save workspaces
async function saveWorkspaces(workspaces) {
    await ensureDirectories();
    await writeFile(WORKSPACES_FILE, JSON.stringify(workspaces, null, 2));
}
// Generate workspace ID
function generateId() {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}
// Add a new workspace
export async function addWorkspace(name, path, options = {}) {
    const workspaces = await loadWorkspaces();
    const resolvedPath = resolve(path);
    // Check if workspace with same path exists
    const existing = workspaces.find(w => w.path === resolvedPath);
    if (existing) {
        throw new Error(`Workspace already exists at this path: ${existing.name}`);
    }
    // Check if name is unique
    if (workspaces.some(w => w.name === name)) {
        throw new Error(`Workspace name already exists: ${name}`);
    }
    // Validate path exists
    try {
        await access(resolvedPath);
    }
    catch {
        throw new Error(`Path does not exist: ${resolvedPath}`);
    }
    // If making default, unset others
    if (options.makeDefault) {
        workspaces.forEach(w => w.isDefault = false);
    }
    const workspace = {
        id: generateId(),
        name,
        path: resolvedPath,
        description: options.description,
        tags: options.tags,
        color: options.color,
        isDefault: options.makeDefault || workspaces.length === 0,
        createdAt: new Date().toISOString()
    };
    workspaces.push(workspace);
    await saveWorkspaces(workspaces);
    return workspace;
}
// Remove a workspace
export async function removeWorkspace(id) {
    const workspaces = await loadWorkspaces();
    const index = workspaces.findIndex(w => w.id === id);
    if (index === -1)
        return false;
    const wasDefault = workspaces[index].isDefault;
    workspaces.splice(index, 1);
    // If we removed the default and there are others, make first one default
    if (wasDefault && workspaces.length > 0) {
        workspaces[0].isDefault = true;
    }
    await saveWorkspaces(workspaces);
    return true;
}
// Get workspace by ID or name
export async function getWorkspace(idOrName) {
    const workspaces = await loadWorkspaces();
    return workspaces.find(w => w.id === idOrName || w.name === idOrName) || null;
}
// Get default workspace
export async function getDefaultWorkspace() {
    const workspaces = await loadWorkspaces();
    return workspaces.find(w => w.isDefault) || workspaces[0] || null;
}
// Set default workspace
export async function setDefaultWorkspace(id) {
    const workspaces = await loadWorkspaces();
    const target = workspaces.find(w => w.id === id);
    if (!target)
        return false;
    workspaces.forEach(w => w.isDefault = false);
    target.isDefault = true;
    await saveWorkspaces(workspaces);
    return true;
}
// Update workspace
export async function updateWorkspace(id, updates) {
    const workspaces = await loadWorkspaces();
    const index = workspaces.findIndex(w => w.id === id);
    if (index === -1)
        return null;
    workspaces[index] = { ...workspaces[index], ...updates };
    await saveWorkspaces(workspaces);
    return workspaces[index];
}
// Switch to workspace
export async function switchToWorkspace(idOrName) {
    const workspace = await getWorkspace(idOrName);
    if (!workspace)
        return null;
    // Update last accessed
    await updateWorkspace(workspace.id, { lastAccessed: new Date().toISOString() });
    // In a real implementation, this would:
    // 1. Stop services in current workspace
    // 2. Change directory
    // 3. Load workspace-specific config
    // 4. Start services in new workspace if needed
    return workspace;
}
// Detect workspaces in common locations
export async function detectWorkspaces(searchPaths = []) {
    const defaultPaths = [
        join(homedir(), 'projects'),
        join(homedir(), 'workspace'),
        join(homedir(), 'code'),
        join(homedir(), 'dev'),
        homedir()
    ];
    const pathsToSearch = [...searchPaths, ...defaultPaths];
    const detected = [];
    for (const searchPath of pathsToSearch) {
        try {
            const entries = await readdir(searchPath, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory())
                    continue;
                const fullPath = join(searchPath, entry.name);
                // Check for Forge indicators
                const indicators = [
                    existsSync(join(fullPath, 'package.json')),
                    existsSync(join(fullPath, 'forge.config.js')),
                    existsSync(join(fullPath, '.forge')),
                    existsSync(join(fullPath, 'web', 'package.json')),
                    existsSync(join(fullPath, 'cli'))
                ];
                const score = indicators.filter(Boolean).length;
                if (score >= 3) {
                    detected.push({ path: fullPath, name: entry.name, confidence: 'high' });
                }
                else if (score >= 1) {
                    detected.push({ path: fullPath, name: entry.name, confidence: 'medium' });
                }
            }
        }
        catch {
            // Ignore errors for paths we can't read
        }
    }
    // Remove duplicates
    const seen = new Set();
    return detected.filter(d => {
        if (seen.has(d.path))
            return false;
        seen.add(d.path);
        return true;
    });
}
// Import workspace from current directory
export async function importCurrentDirectory() {
    const cwd = process.cwd();
    const name = basename(cwd);
    // Check if already imported
    const existing = await getWorkspace(name);
    if (existing) {
        return existing;
    }
    return addWorkspace(name, cwd, { makeDefault: false });
}
// Run command in workspace context
export async function runInWorkspace(workspaceId, command) {
    const workspace = await getWorkspace(workspaceId);
    if (!workspace) {
        throw new Error(`Workspace not found: ${workspaceId}`);
    }
    try {
        const result = await execa('bash', ['-c', command], {
            cwd: workspace.path,
            timeout: 300000,
            all: true
        });
        return {
            success: true,
            output: result.all || result.stdout,
            exitCode: 0
        };
    }
    catch (error) {
        return {
            success: false,
            output: error.all || error.message,
            exitCode: error.exitCode || 1
        };
    }
}
// Get workspace statistics
export async function getWorkspaceStats(workspaceId) {
    const workspace = await getWorkspace(workspaceId);
    if (!workspace)
        return null;
    try {
        // Get disk size
        const { stdout: sizeOutput } = await execa('du', ['-sb', workspace.path], { timeout: 30000 });
        const diskSize = parseInt(sizeOutput.split('\t')[0]);
        // Get file count
        const { stdout: countOutput } = await execa('find', [workspace.path, '-type', 'f'], { timeout: 30000 });
        const fileCount = countOutput.split('\n').length;
        // Get last modified
        const stats = await readFile(join(workspace.path, 'package.json')).catch(() => null);
        const lastModified = stats ? new Date() : new Date();
        // Try to get git info
        let gitBranch;
        let gitCommits;
        try {
            const { stdout: branch } = await execa('git', ['branch', '--show-current'], {
                cwd: workspace.path,
                timeout: 5000
            });
            gitBranch = branch.trim();
            const { stdout: commits } = await execa('git', ['rev-list', '--count', 'HEAD'], {
                cwd: workspace.path,
                timeout: 5000
            });
            gitCommits = parseInt(commits.trim());
        }
        catch {
            // Not a git repo or no commits
        }
        return {
            diskSize,
            fileCount,
            gitBranch,
            gitCommits,
            lastModified
        };
    }
    catch {
        return null;
    }
}
// Export workspace configuration
export async function exportWorkspaceConfig(workspaceId) {
    const workspace = await getWorkspace(workspaceId);
    if (!workspace)
        return null;
    const exportData = {
        ...workspace,
        exportedAt: new Date().toISOString()
    };
    return JSON.stringify(exportData, null, 2);
}
// Import workspace from configuration
export async function importWorkspaceConfig(configJson) {
    const config = JSON.parse(configJson);
    return addWorkspace(config.name, config.path, {
        description: config.description,
        tags: config.tags,
        color: config.color
    });
}
//# sourceMappingURL=workspaceManager.js.map