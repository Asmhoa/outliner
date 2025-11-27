import pytest
from fastapi.testclient import TestClient
from outliner_api_server.api import app
from outliner_api_server.routers.dependencies import get_db
from outliner_api_server.db.userdb import UserDatabase
from outliner_api_server.db.models import PageModel, BlockModel
import os

# Define paths relative to the server directory
TEST_DB_DIR = os.path.join(os.path.dirname(__file__), "test_data")
TEST_USER_DB_PATH = os.path.join(TEST_DB_DIR, "test_search.db")
TEST_DB_ID = "search-test-db-uuid"


@pytest.fixture(scope="module", autouse=True)
def setup_test_data_dir():
    os.makedirs(TEST_DB_DIR, exist_ok=True)
    yield
    # Clean up the directory after all tests in the module are done
    for f in os.listdir(TEST_DB_DIR):
        file_path = os.path.join(TEST_DB_DIR, f)
        if os.path.isfile(file_path):
            os.remove(file_path)
    os.rmdir(TEST_DB_DIR)


@pytest.fixture(scope="module")
def test_db():
    db = UserDatabase(TEST_USER_DB_PATH)
    db.initialize_tables()

    # Create some test data for search
    # Create test pages
    page1 = db.add_page("Python Programming")
    page2 = db.add_page("JavaScript Tutorial")
    page3 = db.add_page("Machine Learning Basics")

    # Add blocks to pages
    db.add_block("Learning Python is fun and powerful", 0, page1)
    db.add_block("JavaScript enables interactive web pages", 0, page2)
    db.add_block("Machine Learning uses algorithms and statistical models", 0, page3)
    db.add_block("Python has great libraries for data science", 1, page1)

    yield db
    db.close_conn()
    if os.path.exists(TEST_USER_DB_PATH):
        os.remove(TEST_USER_DB_PATH)


@pytest.fixture(scope="module")
def client(test_db):
    def override_get_db(db_id: str):
        if db_id == TEST_DB_ID:
            try:
                yield test_db
            finally:
                pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c


def test_search_pages_endpoint(client, test_db):
    """Test the search API endpoint for pages only."""
    search_request = {
        "query": "Python",
        "search_type": "pages",
        "limit": 10
    }
    
    response = client.post(f"/db/{TEST_DB_ID}/search", json=search_request)
    assert response.status_code == 200
    
    data = response.json()
    assert "pages" in data
    assert "blocks" in data
    assert len(data["blocks"]) == 0  # Since we searched for pages only
    
    pages = data["pages"]
    assert len(pages) >= 1
    
    # Check that the Python Programming page is found
    found_python_page = False
    for page in pages:
        if "Python Programming" in page["title"]:
            found_python_page = True
            break
    
    assert found_python_page


def test_search_blocks_endpoint(client, test_db):
    """Test the search API endpoint for blocks only."""
    search_request = {
        "query": "JavaScript",
        "search_type": "blocks",
        "limit": 10
    }
    
    response = client.post(f"/db/{TEST_DB_ID}/search", json=search_request)
    assert response.status_code == 200
    
    data = response.json()
    assert "pages" in data
    assert "blocks" in data
    assert len(data["pages"]) == 0  # Since we searched for blocks only
    
    blocks = data["blocks"]
    assert len(blocks) >= 1
    
    # Check that the JavaScript block is found
    found_javascript_block = False
    for block in blocks:
        if "JavaScript" in block["content"]:
            found_javascript_block = True
            break
    
    assert found_javascript_block


def test_search_all_endpoint(client, test_db):
    """Test the search API endpoint for both pages and blocks."""
    search_request = {
        "query": "Python",
        "search_type": "all",
        "limit": 10
    }
    
    response = client.post(f"/db/{TEST_DB_ID}/search", json=search_request)
    assert response.status_code == 200
    
    data = response.json()
    assert "pages" in data
    assert "blocks" in data
    
    # Should have both pages and blocks containing "Python"
    pages = data["pages"]
    blocks = data["blocks"]
    
    assert len(pages) >= 1
    assert len(blocks) >= 1
    
    # Check that Python page is found
    found_python_page = False
    for page in pages:
        if "Python" in page["title"]:
            found_python_page = True
            break
    
    assert found_python_page
    
    # Check that Python block is found
    found_python_block = False
    for block in blocks:
        if "Python" in block["content"]:
            found_python_block = True
            break
    
    assert found_python_block


def test_search_with_limit(client, test_db):
    """Test the search API endpoint with limit parameter."""
    # First, add more test data to have enough results
    db = test_db
    for i in range(5):
        new_page_id = db.add_page(f"Test Page {i} Python")
        db.add_block(f"Test block content {i} with Python", 0, new_page_id)

    search_request = {
        "query": "Python",
        "search_type": "all",
        "limit": 3
    }

    response = client.post(f"/db/{TEST_DB_ID}/search", json=search_request)
    assert response.status_code == 200

    data = response.json()
    pages = data["pages"]
    blocks = data["blocks"]

    # The limit should apply to each type separately in our implementation
    assert len(pages) <= 3
    assert len(blocks) <= 3


def test_search_no_results(client, test_db):
    """Test the search API endpoint when no results are found."""
    search_request = {
        "query": "NonExistentSearchTerm",
        "search_type": "all",
        "limit": 10
    }
    
    response = client.post(f"/db/{TEST_DB_ID}/search", json=search_request)
    assert response.status_code == 200
    
    data = response.json()
    assert "pages" in data
    assert "blocks" in data
    assert len(data["pages"]) == 0
    assert len(data["blocks"]) == 0


def test_search_invalid_search_type(client, test_db):
    """Test the search API endpoint with an invalid search_type parameter."""
    search_request = {
        "query": "Python",
        "search_type": "invalid_type",
        "limit": 10
    }

    response = client.post(f"/db/{TEST_DB_ID}/search", json=search_request)
    # Invalid search_type will cause Pydantic validation error, returning 422
    assert response.status_code == 422

    error_data = response.json()
    assert "detail" in error_data
    # Error contains validation info about allowed values
    assert any("search_type" in str(detail) for detail in error_data["detail"])


def test_search_missing_query(client, test_db):
    """Test the search API endpoint with missing query parameter."""
    # Create request without query field
    search_request = {
        "search_type": "all",
        "limit": 10
    }
    
    response = client.post(f"/db/{TEST_DB_ID}/search", json=search_request)
    assert response.status_code == 422  # Unprocessable Entity due to Pydantic validation


def test_search_default_values(client, test_db):
    """Test the search API endpoint with default values."""
    search_request = {
        "query": "Python"
        # search_type defaults to "all", limit defaults to 10
    }
    
    response = client.post(f"/db/{TEST_DB_ID}/search", json=search_request)
    assert response.status_code == 200
    
    data = response.json()
    assert "pages" in data
    assert "blocks" in data
    # Should return both pages and blocks (default search_type="all")
    # Default limit is 10, so we get up to 10 of each


def test_search_advanced_mode(client, test_db):
    """Test the search API endpoint with advanced mode enabled."""
    search_request = {
        "query": "Python OR JavaScript",
        "search_type": "all",
        "limit": 10,
        "advanced": True  # Should not escape special characters, allowing boolean operators
    }
    
    response = client.post(f"/db/{TEST_DB_ID}/search", json=search_request)
    assert response.status_code == 200
    
    data = response.json()
    assert "pages" in data
    assert "blocks" in data
    
    # In advanced mode, search should handle boolean operators if supported by FTS
    # We expect to find content related to either Python or JavaScript


def test_search_multiple_words(client, test_db):
    """Test the search API endpoint with multiple words."""
    search_request = {
        "query": "Machine Learning",
        "search_type": "all",
        "limit": 10
    }
    
    response = client.post(f"/db/{TEST_DB_ID}/search", json=search_request)
    assert response.status_code == 200
    
    data = response.json()
    assert "pages" in data
    assert "blocks" in data
    
    # Should find pages/blocks containing both words or phrases
    found_ml_content = False
    for page in data["pages"]:
        if "Machine Learning" in page["title"]:
            found_ml_content = True
            break
    
    for block in data["blocks"]:
        if "Machine Learning" in block["content"]:
            found_ml_content = True
            break
    
    assert found_ml_content


def test_search_phrase_match(client, test_db):
    """Test the search API endpoint with phrase matching."""
    search_request = {
        "query": '"Python is fun"',
        "search_type": "blocks",
        "limit": 10
    }
    
    response = client.post(f"/db/{TEST_DB_ID}/search", json=search_request)
    assert response.status_code == 200
    
    data = response.json()
    assert "pages" in data
    assert "blocks" in data
    
    # Should find blocks containing the exact phrase
    found_phrase = False
    for block in data["blocks"]:
        if "Python is fun" in block["content"]:
            found_phrase = True
            break
    
    assert found_phrase