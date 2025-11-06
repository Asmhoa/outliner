import os


def is_test_env():
    """
    Check if the application is running in test mode.

    Returns True if OUTLINER_TEST_MODE environment variable is set to
    'true', '1', or 'True' (case-insensitive), False otherwise.
    """
    test_mode = str(os.environ.get("OUTLINER_TEST_MODE", "")).lower()
    return test_mode in ["true", "1", "yes", "on"]


def get_log_level():
    log_level = os.environ.get("LOG_LEVEL", "info")
    return log_level
