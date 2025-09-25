import logging
import uvicorn
from api import app

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', filename='server.log')

if __name__ == "__main__":
    # Start backend server
    uvicorn.run(app, host="0.0.0.0", port=8000)
