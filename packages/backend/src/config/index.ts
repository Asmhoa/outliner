import path from "path";

export const PORT = parseInt(process.env.PORT || '8000', 10);
// There are functions rather than constants to allow tests to modify process.env.X and have the change take effect.
export const SYSTEM_DB_PATH = (): string => process.env.SYSTEM_DB_PATH || path.join(require('os').homedir(), '.outliner', 'databases');
export const SYSTEM_DB_NAME = (): string => process.env.SYSTEM_DB_NAME || 'system.db';
