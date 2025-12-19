/**
 * Custom exception classes for the Outliner API server.
 */

abstract class OutlinerDBError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PageAlreadyExistsError extends OutlinerDBError {
  constructor(message: string = "Page already exists") {
    super(message);
  }
}

export class PageNotFoundError extends OutlinerDBError {
  constructor(message: string = "Page not found") {
    super(message);
  }
}

export class WorkspaceNotFoundError extends OutlinerDBError {
  constructor(message: string = "Workspace not found") {
    super(message);
  }
}

export class BlockNotFoundError extends OutlinerDBError {
  constructor(message: string = "Block not found") {
    super(message);
  }
}

export class UserDatabaseNotFoundError extends OutlinerDBError {
  constructor(message: string = "User database not found") {
    super(message);
  }
}

export class UserDatabaseAlreadyExistsError extends OutlinerDBError {
  constructor(message: string = "User database already exists") {
    super(message);
  }
}
