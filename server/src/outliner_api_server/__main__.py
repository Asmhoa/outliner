import json
import logging
import os
import uvicorn
from outliner_api_server.api import app
from outliner_api_server.utils import is_test_env
from outliner_api_server.constants import SERVER_PORT, TESTING_PORT

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
    filename="server.log",
)


def start_api():
    port = TESTING_PORT if is_test_env() else SERVER_PORT
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    start_api()
