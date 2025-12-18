import fs from 'fs';
import os from 'os';
import path from 'path';
import { SystemDatabase } from '../src/database/system';
import { UserDatabase } from '../src/database/user';

// Clean up any leftover test databases
afterEach(() => {
  // No specific cleanup needed since we're using temp directories that get cleaned up automatically
});

export { SystemDatabase, UserDatabase };