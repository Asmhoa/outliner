"""
Custom exception classes for the Outliner API server.
"""


class PageAlreadyExistsError(Exception):
    """Raised when trying to create a page with a title that already exists."""

    pass


class PageNotFoundError(Exception):
    """Raised when a page is not found."""

    pass


class WorkspaceNotFoundError(Exception):
    """Raised when a workspace is not found."""

    pass


class BlockNotFoundError(Exception):
    """Raised when a block is not found."""

    pass


class UserDatabaseAlreadyExistsError(Exception):
    """Raised when trying to create a user database that already exists."""

    pass


class UserDatabaseNotFoundError(Exception):
    """Raised when a user database is not found."""

    pass