import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import sqlite3

# Set environment variable for test database before importing app
TEST_DB = "test_scrabble.db"
os.environ["DB_NAME"] = TEST_DB

# Import app after setting env var
from backend.main import app
from backend.database import init_db, get_db_connection

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    # Remove existing test db if any
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

    # Initialize the database
    init_db()

    yield

    # Cleanup
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

def test_create_player():
    response = client.post("/players", json={"name": "Alice", "number": "123"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Alice"
    assert data["number"] == "123"
    assert "id" in data

def test_search_player():
    client.post("/players", json={"name": "Bob", "number": "456"})
    response = client.get("/players?query=Bob")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["name"] == "Bob"

def test_create_game_and_play():
    # 1. Create Players
    p1_res = client.post("/players", json={"name": "P1", "number": "001"})
    p1_id = p1_res.json()["id"]

    p2_res = client.post("/players", json={"name": "P2", "number": "002"})
    p2_id = p2_res.json()["id"]

    # 2. Create Game
    game_data = {
        "name": "Test Game",
        "turn_duration": 60,
        "teams": [
            {"name": "Team A", "players": [p1_id]},
            {"name": "Team B", "players": [p2_id]}
        ]
    }
    game_res = client.post("/games", json=game_data)
    assert game_res.status_code == 200
    game_id = game_res.json()["game_id"]

    # 3. Submit Turn
    turn_data = {
        "base_score": 10,
        "bingo": False
    }
    # Current turn should be Team A, Player P1 (first team, first player)
    turn_res = client.post(f"/games/{game_id}/turns", json=turn_data)
    if turn_res.status_code != 200:
        print(turn_res.json())
    assert turn_res.status_code == 200
    turn_json = turn_res.json()
    # Check updated leaderboard instead of team_scores
    assert turn_json["leaderboard"][1]["score"] == 10 or turn_json["leaderboard"][0]["score"] == 10

    # 4. End Game
    end_res = client.post(f"/games/{game_id}/end")
    assert end_res.status_code == 200

    # 5. Check History
    history_res = client.get("/history")
    assert history_res.status_code == 200
    history = history_res.json()
    assert any(g["game_id"] == game_id for g in history)

def test_player_stats():
    # Helper to create a completed game
    # Create player
    p_res = client.post("/players", json={"name": "StatsPlayer", "number": "999"})
    p_id = p_res.json()["id"]

    # Create game
    game_data = {
        "name": "Stats Game",
        "turn_duration": 60,
        "teams": [
            {"name": "Winner Team", "players": [p_id]}
        ]
    }
    g_res = client.post("/games", json=game_data)
    g_id = g_res.json()["game_id"]

    # Play turn
    client.post(f"/games/{g_id}/turns", json={"base_score": 50, "bingo": True}) # 50 + 50 = 100

    # End game
    client.post(f"/games/{g_id}/end")

    # Check stats
    stats_res = client.get(f"/stats/players/{p_id}")
    assert stats_res.status_code == 200
    stats = stats_res.json()

    assert stats["total_games"] >= 1
    assert stats["high_score_solo"] >= 100
    assert stats["avg_score"] >= 100
