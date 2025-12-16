/**
 * Custom exception classes for the Outliner API server.
 */

export class PageAlreadyExistsError extends Error {
  constructor(message: string = "Page already exists") {
    super(message);
    this.name = "PageAlreadyExistsError";
  }
}

export class PageNotFoundError extends Error {
  constructor(message: string = "Page not found") {
    super(message);
    this.name = "PageNotFoundError";
  }
}

export class WorkspaceNotFoundError extends Error {
  constructor(message: string = "Workspace not found") {
    super(message);
    this.name = "WorkspaceNotFoundError";
  }
}

export class BlockNotFoundError extends Error {
  constructor(message: string = "Block not found") {
    super(message);
    this.name = "BlockNotFoundError";
  }
}

export class UserDatabaseNotFoundError extends Error {
  constructor(message: string = "User database not found") {
    super(message);
    this.name = "UserDatabaseNotFoundError";
  }
}

export class UserDatabaseAlreadyExistsError extends Error {
  constructor(message: string = "User database already exists") {
    super(message);
    this.name = "UserDatabaseAlreadyExistsError";
  }
}