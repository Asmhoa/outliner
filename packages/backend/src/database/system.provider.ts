import { Request, Response, NextFunction } from 'express';
import { SystemDatabase } from './system';
import { UserDatabase } from './user';
import { UserDatabaseNotFoundError } from './errors';
import { SYSTEM_DB_PATH } from '../config';

/**
 * Creates a singleton system database instance to be used across all routes.
 */
export class SystemDatabaseProvider {
  private static instance: SystemDatabase | null = null;

  static getInstance(): SystemDatabase {
    if (!SystemDatabaseProvider.instance) {
      SystemDatabaseProvider.instance = new SystemDatabase(SYSTEM_DB_PATH());
    }
    return SystemDatabaseProvider.instance;
  }

  static closeInstance(): void {
    if (SystemDatabaseProvider.instance) {
      SystemDatabaseProvider.instance.close();
      SystemDatabaseProvider.instance = null;
    }
  }
}

/**
 * Middleware to provide system database dependency to routes.
 */
export const injectSystemDatabase = (req: Request, res: Response, next: NextFunction) => {
  const sysDb = SystemDatabaseProvider.getInstance();
  (req as any).sysDb = sysDb;
  next();
};

/**
 * Middleware helper to get a user database instance based on the db_id parameter.
 */
export const getUserDatabase = (db_id: string) => {
  const sysDb = SystemDatabaseProvider.getInstance();

  try {
    const dbInfo = sysDb.getUserDatabaseById(db_id);
    return new UserDatabase(dbInfo.path);
  } catch (error) {
    if (error instanceof UserDatabaseNotFoundError) {
      throw error;
    }
    throw new UserDatabaseNotFoundError(`Database with id '${db_id}' not found. Please create it first.`);
  }
};
