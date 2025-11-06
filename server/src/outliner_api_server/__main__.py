import logging
import uvicorn
from outliner_api_server.api import app
from outliner_api_server.utils import is_test_env, get_log_level
from outliner_api_server.constants import SERVER_PORT, TESTING_PORT


def start_api():
    port = TESTING_PORT if is_test_env() else SERVER_PORT
    uvicorn.run(app, host="0.0.0.0", port=port, log_level=get_log_level())


if __name__ == "__main__":
    start_api()
