import sqlite3
import json
import os
from datetime import datetime
from uuid import UUID

DB_NAME = os.environ.get("DB_NAME", "scrabble.db")

if os.environ.get("VERCEL"):
    DB_NAME = "/tmp/scrabble.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()

    # Players table
    c.execute('''
        CREATE TABLE IF NOT EXISTS players (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            number TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name, number)
        )
    ''')

    # Games table
    # Added 'name' column
    c.execute('''
        CREATE TABLE IF NOT EXISTS games (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            turn_duration INTEGER NOT NULL,
            current_turn_index INTEGER DEFAULT 0,
            turn_started_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP
        )
    ''')

    # Teams table
    c.execute('''
        CREATE TABLE IF NOT EXISTS teams (
            id TEXT PRIMARY KEY,
            game_id TEXT NOT NULL,
            name TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            FOREIGN KEY (game_id) REFERENCES games (id)
        )
    ''')

    # Game Players (Linking Teams to Players)
    c.execute('''
        CREATE TABLE IF NOT EXISTS game_players (
            game_id TEXT NOT NULL,
            team_id TEXT NOT NULL,
            player_id TEXT NOT NULL,
            FOREIGN KEY (game_id) REFERENCES games (id),
            FOREIGN KEY (team_id) REFERENCES teams (id),
            FOREIGN KEY (player_id) REFERENCES players (id)
        )
    ''')

    # Turns table
    c.execute('''
        CREATE TABLE IF NOT EXISTS turns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            turn_number INTEGER NOT NULL,
            game_id TEXT NOT NULL,
            team_id TEXT NOT NULL,
            player_id TEXT NOT NULL,
            base_score INTEGER NOT NULL,
            bingo BOOLEAN NOT NULL,
            total_score INTEGER NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (game_id) REFERENCES games (id),
            FOREIGN KEY (team_id) REFERENCES teams (id),
            FOREIGN KEY (player_id) REFERENCES players (id)
        )
    ''')

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
