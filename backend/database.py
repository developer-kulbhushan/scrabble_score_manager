import sqlite3
import json
import os
import psycopg2
from psycopg2.extras import DictCursor
from datetime import datetime
from uuid import UUID
from dotenv import load_dotenv

load_dotenv()

DB_NAME = os.environ.get("DB_NAME", "scrabble.db")
DATABASE_URL = os.environ.get("DATABASE_URL")

if os.environ.get("VERCEL") and not DATABASE_URL:
    DB_NAME = "/tmp/scrabble.db"

def get_db_connection():
    if DATABASE_URL:
        try:
            conn = psycopg2.connect(DATABASE_URL, cursor_factory=DictCursor)
            return conn
        except psycopg2.Error as e:
            print(f"Error connecting to Postgres: {e}")
            raise e
    else:
        conn = sqlite3.connect(DB_NAME)
        conn.row_factory = sqlite3.Row
        return conn

def execute_query(conn, query, params=()):
    if DATABASE_URL:
        # Postgres uses %s for placeholders
        query = query.replace("?", "%s")
        cur = conn.cursor()
        cur.execute(query, params)
        return cur
    else:
        # SQLite uses ? for placeholders
        return conn.execute(query, params)

def init_db():
    conn = get_db_connection()

    # Players table
    execute_query(conn, '''
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
    execute_query(conn, '''
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
    execute_query(conn, '''
        CREATE TABLE IF NOT EXISTS teams (
            id TEXT PRIMARY KEY,
            game_id TEXT NOT NULL,
            name TEXT NOT NULL,
            score INTEGER DEFAULT 0,
            FOREIGN KEY (game_id) REFERENCES games (id)
        )
    ''')

    # Game Players (Linking Teams to Players)
    execute_query(conn, '''
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
    if DATABASE_URL:
        turns_id_def = "id SERIAL PRIMARY KEY"
    else:
        turns_id_def = "id INTEGER PRIMARY KEY AUTOINCREMENT"

    execute_query(conn, f'''
        CREATE TABLE IF NOT EXISTS turns (
            {turns_id_def},
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
