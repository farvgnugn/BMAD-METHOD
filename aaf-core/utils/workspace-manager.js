import fs from 'node:fs';
import path from 'node:path';

class WorkspaceManager {
    constructor() {
        this.locksDir = path.join(process.cwd(), '.aaf-core', 'locks');
        this.ensureLocksDirectory();
    }

    ensureLocksDirectory() {
        if (!fs.existsSync(this.locksDir)) {
            fs.mkdirSync(this.locksDir, { recursive: true });
        }
    }

    async claimFile(filePath, agentName) {
        const lockFile = path.join(this.locksDir, this.getLockFileName(filePath));

        try {
            // Check if file is already locked
            if (fs.existsSync(lockFile)) {
                const lockInfo = JSON.parse(fs.readFileSync(lockFile, 'utf8'));

                if (lockInfo.agentName !== agentName) {
                    return {
                        success: false,
                        lockedBy: lockInfo.agentName,
                        lockedAt: lockInfo.lockedAt
                    };
                }
            }

            // Create lock
            const lockInfo = {
                agentName,
                filePath,
                lockedAt: new Date().toISOString(),
                storyId: this.extractStoryIdFromPath(filePath)
            };

            fs.writeFileSync(lockFile, JSON.stringify(lockInfo, null, 2));

            return { success: true, lockInfo };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async releaseFile(filePath, agentName) {
        const lockFile = path.join(this.locksDir, this.getLockFileName(filePath));

        try {
            if (fs.existsSync(lockFile)) {
                const lockInfo = JSON.parse(fs.readFileSync(lockFile, 'utf8'));

                if (lockInfo.agentName === agentName) {
                    fs.unlinkSync(lockFile);
                    return { success: true };
                }
            }

            return { success: false, error: 'File not locked by this agent' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getFileLocks(agentName = null) {
        const locks = [];

        try {
            const lockFiles = fs.readdirSync(this.locksDir);

            for (const lockFile of lockFiles) {
                const lockPath = path.join(this.locksDir, lockFile);
                const lockInfo = JSON.parse(fs.readFileSync(lockPath, 'utf8'));

                if (!agentName || lockInfo.agentName === agentName) {
                    locks.push(lockInfo);
                }
            }
        } catch (error) {
            console.warn('Error reading locks:', error.message);
        }

        return locks;
    }

    async cleanupStaleLocks(maxAgeHours = 4) {
        try {
            const lockFiles = fs.readdirSync(this.locksDir);
            const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

            for (const lockFile of lockFiles) {
                const lockPath = path.join(this.locksDir, lockFile);
                const lockInfo = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
                const lockedAt = new Date(lockInfo.lockedAt);

                if (lockedAt < cutoffTime) {
                    fs.unlinkSync(lockPath);
                    console.log(`🧹 Cleaned up stale lock: ${lockInfo.filePath} (${lockInfo.agentName})`);
                }
            }
        } catch (error) {
            console.warn('Error cleaning up locks:', error.message);
        }
    }

    getLockFileName(filePath) {
        // Convert file path to safe filename
        return filePath.replace(/[/\\:*?"<>|]/g, '_') + '.lock';
    }

    extractStoryIdFromPath(filePath) {
        // Extract story ID from file path if possible
        const match = filePath.match(/(\d+[\.\-]\d+)/);
        return match ? match[1].replace(/-/g, '.') : null;
    }
}

export default WorkspaceManager;