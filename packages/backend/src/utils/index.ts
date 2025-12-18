/**
 * Utility functions for the Outliner API server.
 */

/**
 * Check if running in test mode
 */
export function isTestEnv(): boolean {
  return process.env.OUTLINER_TEST_MODE === '1' || 
         process.env.NODE_ENV === 'test' ||
         process.env.JEST_WORKER_ID !== undefined;
}