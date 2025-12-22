import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { vi } from 'vitest';
import { SystemDatabase } from '../../../src/database/system';

export interface DbTestSetup {
  tempDir: string;
  sysDb: SystemDatabase;
}

export function setupTestSystemDatabase(): DbTestSetup {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-system-db-'));
  const sysDb = new SystemDatabase(tempDir);

  // Assign SYSTEM_DB_PATH so that the SystemDatabaseProvider uses the correct instance of the db.
  // This is only really needed for tests that have code paths using SystemDatabaseProvider (all routers).
  vi.stubEnv('SYSTEM_DB_PATH', tempDir);

  return { tempDir, sysDb };
}

export function teardownTestSystemDatabase(setup: DbTestSetup): void {
  setup.sysDb.close();
  fs.rmSync(setup.tempDir, { recursive: true, force: true });
}
