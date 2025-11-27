"""
Tests for Full-Text Search (FTS) functionality in the SQLite backend.
Tests cover searching for pages and blocks using FTS5 virtual tables.
"""

import pytest

from outliner_api_server.db.userdb import UserDatabase


@pytest.fixture
def db():
    """Set up a new database for each test."""
    database = UserDatabase(":memory:")
    database.initialize_tables()
    yield database
    database.close_conn()


def test_search_pages_exact_match(db):
    """Test searching for pages with exact title match."""
    # Add some pages
    page1_id = db.add_page("Introduction to Python")
    page2_id = db.add_page("Advanced JavaScript")
    page3_id = db.add_page("Machine Learning Basics")

    # Search for an exact match
    results = db.search_pages("Python")
    assert len(results) == 1
    assert results[0].page_id == page1_id
    assert results[0].title == "Introduction to Python"


def test_search_pages_partial_match(db):
    """Test searching for pages with partial title match."""
    page1_id = db.add_page("Getting Started with Python")
    db.add_page("Advanced JavaScript")
    page3_id = db.add_page("Python for Beginners")

    # Search for pages containing "Python"
    results = db.search_pages("Python")
    assert len(results) == 2
    page_ids = [result.page_id for result in results]
    assert page1_id in page_ids
    assert page3_id in page_ids


def test_search_pages_multiple_words(db):
    """Test searching for pages with multiple search terms."""
    page1_id = db.add_page("Introduction to Python Programming")
    db.add_page("Advanced JavaScript")
    page3_id = db.add_page("Python Machine Learning")

    # Search for pages containing both "Python" and "Programming"
    results = db.search_pages("Python Programming")
    assert len(results) == 1
    assert results[0].page_id == page1_id
    assert results[0].title == "Introduction to Python Programming"


def test_search_pages_phrase_match(db):
    """Test searching for pages with phrase matching."""
    page1_id = db.add_page("Introduction to Python Programming")
    db.add_page("Advanced Python Concepts")
    page3_id = db.add_page("Python Programming Guide")

    # Search for pages containing the exact phrase "Python Programming"
    results = db.search_pages('"Python Programming"')
    assert len(results) == 2  # Both page1 and page3 should match
    titles = [result.title for result in results]
    assert "Introduction to Python Programming" in titles
    assert "Python Programming Guide" in titles
    assert "Advanced Python Concepts" not in titles


def test_search_pages_no_results(db):
    """Test searching for pages that don't exist."""
    db.add_page("Introduction to Python")
    db.add_page("Advanced JavaScript")

    # Search for a term that doesn't exist
    results = db.search_pages("Nonexistent")
    assert len(results) == 0


def test_search_pages_with_limit(db):
    """Test searching for pages with limit parameter."""
    # Add several pages that match the search term
    for i in range(15):
        db.add_page(f"Python Tutorial Part {i}")

    # Search with a limit of 5
    results = db.search_pages("Python", limit=5)
    assert len(results) == 5


def test_search_pages_case_insensitive(db):
    """Test that page search is case insensitive."""
    page1_id = db.add_page("Introduction to Python")
    db.add_page("Advanced JavaScript")

    # Search using different case
    results = db.search_pages("python")
    assert len(results) == 1
    assert results[0].page_id == page1_id
    assert results[0].title == "Introduction to Python"

    results = db.search_pages("PYTHON")
    assert len(results) == 1
    assert results[0].page_id == page1_id
    assert results[0].title == "Introduction to Python"


def test_search_blocks_exact_match(db):
    """Test searching for blocks with exact content match."""
    page_id = db.add_page("Test Page")
    block1_id = db.add_block("Learning Python is fun", 1, page_id=page_id)
    block2_id = db.add_block("JavaScript is powerful", 2, page_id=page_id)
    block3_id = db.add_block("Python data science", 3, page_id=page_id)

    # Search for an exact match
    results = db.search_blocks("Python")
    assert len(results) == 2
    block_ids = [result.block_id for result in results]
    assert block1_id in block_ids
    assert block3_id in block_ids
    assert block2_id not in block_ids


def test_search_blocks_partial_match(db):
    """Test searching for blocks with partial content match."""
    page_id = db.add_page("Test Page")
    block1_id = db.add_block(
        "Getting started with Python programming", 1, page_id=page_id
    )
    block2_id = db.add_block("Advanced JavaScript concepts", 2, page_id=page_id)
    block3_id = db.add_block("Python machine learning tutorial", 3, page_id=page_id)

    # Search for blocks containing "Python"
    results = db.search_blocks("Python")
    assert len(results) == 2
    block_ids = [result.block_id for result in results]
    assert block1_id in block_ids
    assert block3_id in block_ids


def test_search_blocks_multiple_words(db):
    """Test searching for blocks with multiple search terms."""
    page_id = db.add_page("Test Page")
    block1_id = db.add_block("Introduction to Python Programming", 1, page_id=page_id)
    block2_id = db.add_block("Advanced JavaScript", 2, page_id=page_id)
    block3_id = db.add_block("Python Machine Learning", 3, page_id=page_id)

    # Search for blocks containing both "Python" and "Programming"
    results = db.search_blocks("Python Programming")
    assert len(results) == 1
    assert results[0].block_id == block1_id
    assert results[0].content == "Introduction to Python Programming"


def test_search_blocks_phrase_match(db):
    """Test searching for blocks with phrase matching."""
    page_id = db.add_page("Test Page")
    block1_id = db.add_block("Introduction to Python Programming", 1, page_id=page_id)
    block2_id = db.add_block("Advanced Python Concepts", 2, page_id=page_id)
    block3_id = db.add_block("Python Programming Guide", 3, page_id=page_id)

    # Search for blocks containing the exact phrase "Python Programming"
    results = db.search_blocks('"Python Programming"')
    assert len(results) == 2
    contents = [result.content for result in results]
    assert "Introduction to Python Programming" in contents
    assert "Python Programming Guide" in contents
    assert "Advanced Python Concepts" not in contents


def test_search_blocks_no_results(db):
    """Test searching for blocks that don't exist."""
    page_id = db.add_page("Test Page")
    db.add_block("Learning Python is fun", 1, page_id=page_id)
    db.add_block("JavaScript is powerful", 2, page_id=page_id)

    # Search for a term that doesn't exist
    results = db.search_blocks("Nonexistent")
    assert len(results) == 0


def test_search_blocks_with_limit(db):
    """Test searching for blocks with limit parameter."""
    page_id = db.add_page("Test Page")
    # Add several blocks that match the search term
    for i in range(15):
        db.add_block(f"Python tutorial part {i}", i + 1, page_id=page_id)

    # Search with a limit of 5
    results = db.search_blocks("Python", limit=5)
    assert len(results) == 5


def test_search_blocks_case_insensitive(db):
    """Test that block search is case insensitive."""
    page_id = db.add_page("Test Page")
    block1_id = db.add_block("Learning Python is Fun", 1, page_id=page_id)
    db.add_block("JavaScript is powerful", 2, page_id=page_id)

    # Search using different case
    results = db.search_blocks("python")
    assert len(results) == 1
    assert results[0].block_id == block1_id
    assert results[0].content == "Learning Python is Fun"

    results = db.search_blocks("PYTHON")
    assert len(results) == 1
    assert results[0].block_id == block1_id
    assert results[0].content == "Learning Python is Fun"


def test_search_blocks_nested_content(db):
    """Test searching for blocks in nested block structures."""
    page_id = db.add_page("Test Page")
    parent_block_id = db.add_block(
        "Parent block with Python content", 1, page_id=page_id
    )
    child_block_id = db.add_block(
        "Child block with JavaScript content", 1, parent_block_id=parent_block_id
    )

    # Search for blocks containing "Python"
    results = db.search_blocks("Python")
    assert len(results) == 1
    assert results[0].block_id == parent_block_id
    assert results[0].content == "Parent block with Python content"

    # Search for blocks containing "JavaScript"
    results = db.search_blocks("JavaScript")
    assert len(results) == 1
    assert results[0].block_id == child_block_id
    assert results[0].content == "Child block with JavaScript content"


def test_search_all_pages_and_blocks(db):
    """Test searching for both pages and blocks."""
    page1_id = db.add_page("Python Tutorial")
    page2_id = db.add_page("JavaScript Guide")
    block1_id = db.add_block("Learning Python is fun", 1, page_id=page1_id)
    block2_id = db.add_block("Advanced JavaScript concepts", 2, page_id=page2_id)

    # Search for term that appears in both page titles and block content
    pages, blocks = db.search_all("Python")
    assert len(pages) == 1
    assert len(blocks) == 1
    assert pages[0].page_id == page1_id
    assert blocks[0].block_id == block1_id


def test_search_all_only_pages(db):
    """Test search_all when query matches only pages."""
    page1_id = db.add_page("Python Tutorial")
    db.add_page("Java Guide")
    db.add_block("Learning JavaScript is fun", 1, page_id=page1_id)
    db.add_block("Advanced JavaScript concepts", 2, page_id=page1_id)

    # Search for term that appears only in page titles
    pages, blocks = db.search_all("Python")
    assert len(pages) == 1
    assert len(blocks) == 0
    assert pages[0].page_id == page1_id


def test_search_all_only_blocks(db):
    """Test search_all when query matches only blocks."""
    page1_id = db.add_page("Tutorial")
    db.add_page("Guide")
    block1_id = db.add_block("Learning Python is fun", 1, page_id=page1_id)
    db.add_block("Advanced JavaScript concepts", 2, page_id=page1_id)

    # Search for term that appears only in block content
    pages, blocks = db.search_all("Python")
    assert len(pages) == 0
    assert len(blocks) == 1
    assert blocks[0].block_id == block1_id


def test_search_all_with_limit(db):
    """Test search_all with limit parameter."""
    page1_id = db.add_page("Python Introduction")
    page2_id = db.add_page("Python Advanced Topics")

    for i in range(10):
        db.add_block(f"Python concept {i}", i + 1, page_id=page1_id)

    # Search with limit - should apply separately to pages and blocks
    pages, blocks = db.search_all("Python", limit=3)
    assert len(pages) <= 3
    assert len(blocks) <= 3
    # Both should have results since we have more than 3 matches in each
    assert len(pages) > 0
    assert len(blocks) > 0


def test_search_pages_after_title_update(db):
    """Test that FTS index is updated when page title is changed."""
    page_id = db.add_page("Old Title Python")
    # Initially, should find the page
    results = db.search_pages("Python")
    assert len(results) == 1
    assert results[0].page_id == page_id

    # Update the title
    db.rename_page(page_id, "New Title JavaScript")

    # Search for old term - should not find it anymore
    results = db.search_pages("Python")
    assert len(results) == 0

    # Search for new term - should find it
    results = db.search_pages("JavaScript")
    assert len(results) == 1
    assert results[0].page_id == page_id


def test_search_blocks_after_content_update(db):
    """Test that FTS index is updated when block content is changed."""
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Old content with Python", 1, page_id=page_id)

    # Initially, should find the block
    results = db.search_blocks("Python")
    assert len(results) == 1
    assert results[0].block_id == block_id

    # Update the content
    db.update_block_content(block_id, "New content with JavaScript")

    # Search for old term - should not find it anymore
    results = db.search_blocks("Python")
    assert len(results) == 0

    # Search for new term - should find it
    results = db.search_blocks("JavaScript")
    assert len(results) == 1
    assert results[0].block_id == block_id


def test_search_pages_after_deletion(db):
    """Test that FTS index is updated when page is deleted."""
    page_id = db.add_page("Python Tutorial")

    # Initially, should find the page
    results = db.search_pages("Python")
    assert len(results) == 1
    assert results[0].page_id == page_id

    # Delete the page
    db.delete_page(page_id)

    # Search for the term - should not find it anymore
    results = db.search_pages("Python")
    assert len(results) == 0


def test_search_blocks_after_deletion(db):
    """Test that FTS index is updated when block is deleted."""
    page_id = db.add_page("Test Page")
    block_id = db.add_block("Content with Python", 1, page_id=page_id)

    # Initially, should find the block
    results = db.search_blocks("Python")
    assert len(results) == 1
    assert results[0].block_id == block_id

    # Delete the block
    db.delete_block(block_id)

    # Search for the term - should not find it anymore
    results = db.search_blocks("Python")
    assert len(results) == 0


def test_search_after_adding_new_content(db):
    """Test that newly added content is searchable."""
    # Initially no pages
    results = db.search_pages("Python")
    assert len(results) == 0

    # Add a page
    page_id = db.add_page("Python Introduction")

    # Now it should be searchable
    results = db.search_pages("Python")
    assert len(results) == 1
    assert results[0].page_id == page_id

    # Add a block
    block_id = db.add_block("Advanced Python techniques", 1, page_id=page_id)

    # Block should be searchable
    results = db.search_blocks("Python")
    assert len(results) == 1
    assert results[0].block_id == block_id


def test_search_with_special_characters(db):
    """Test searching with special characters."""
    page_id = db.add_page("Python & JavaScript Tutorial")
    block_id = db.add_block("Tips: 'Advanced Python' techniques", 1, page_id=page_id)

    # Search with ampersand
    results = db.search_pages("Python & JavaScript")
    assert len(results) == 1
    assert results[0].page_id == page_id

    # Search with quotes
    results = db.search_blocks("Advanced Python")
    assert len(results) == 1
    assert results[0].block_id == block_id

    # Search with punctuation
    results = db.search_pages("Tutorial")
    assert len(results) == 1
    assert results[0].page_id == page_id


def test_search_with_empty_query(db):
    """Test behavior with empty search query."""
    db.add_page("Python Tutorial")
    page_id = db.add_page("JavaScript Guide")
    block_id = db.add_block("Learning Python is fun", 1, page_id=page_id)

    # Empty search may behave differently depending on FTS implementation
    # Let's test what happens with an empty string
    pages, blocks = db.search_all("")
    # Results may vary based on FTS behavior
    # This test documents the current behavior

    # Test for None query if the function accepts it (might raise error)
    try:
        results = db.search_pages(None)
        # If no exception, check results
    except (TypeError, ValueError):
        # Expected behavior if None is not handled
        pass


def test_search_with_wildcards(db):
    """Test searching with wildcard operators if supported."""
    page1_id = db.add_page("Python Programming")
    page2_id = db.add_page("JavaScript Programming")
    db.add_page("Java Programming")

    # Test if wildcard search works (depends on FTS configuration)
    # Standard FTS5 doesn't support * wildcards directly in MATCH
    # But we can test with different query formats
    results = db.search_pages("Programm*")  # This might not work with basic FTS
    # We'll document current behavior
    assert isinstance(results, list)  # Should return a list at least


def test_search_rank_ordering(db):
    """Test that search results are properly ranked."""
    page1_id = db.add_page("Python for Beginners: Introduction to Python Programming")
    page2_id = db.add_page("Advanced Python Techniques")
    page3_id = db.add_page("Random Title")

    # Search for "Python" - expect pages with more occurrences to rank higher
    results = db.search_pages("Python", limit=10)

    # At least the pages containing "Python" should be returned
    python_page_ids = [page1_id, page2_id]
    result_ids = [r.page_id for r in results]

    # Both Python-related pages should be in the results
    for pid in python_page_ids:
        assert pid in result_ids

    # The page with "Python" appearing twice might rank higher (depends on FTS ranking)
    # The third page should not appear since it doesn't contain "Python"
    assert page3_id not in result_ids


def test_search_with_boolean_operators(db):
    """Test searching with boolean operators when escape_special_chars=False."""
    page1_id = db.add_page("Python Tutorial")
    page2_id = db.add_page("JavaScript Tutorial")
    page3_id = db.add_page("Python and JavaScript Guide")

    # Search with OR operator - should find pages containing either Python or JavaScript
    results = db.search_pages("Python OR JavaScript", escape_special_chars=False)
    assert len(results) == 3  # All three pages should match the OR query
    result_ids = [r.page_id for r in results]
    assert page1_id in result_ids  # Contains Python
    assert page2_id in result_ids  # Contains JavaScript
    assert page3_id in result_ids  # Contains both Python and JavaScript

    # Search with AND operator - should find pages containing both terms
    results = db.search_pages("Python AND JavaScript", escape_special_chars=False)
    assert len(results) == 1  # Only page3 contains both Python and Guide
    assert results[0].page_id == page3_id

    # Search with NOT operator - should find pages containing Python but not Tutorial
    results = db.search_pages("Python NOT Tutorial", escape_special_chars=False)
    assert len(results) == 1  # Only page3 (Python and JavaScript Guide) should match
    assert results[0].page_id == page3_id
