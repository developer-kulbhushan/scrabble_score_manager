from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone
import math
import sqlite3
from .database import init_db, get_db_connection

app = FastAPI()

# CORS configuration
origins = [
    "https://scrabble-score-manager-frontend.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

# --------------------
# Models
# --------------------

class PlayerCreate(BaseModel):
    name: str
    number: str

class Player(BaseModel):
    id: str
    name: str
    number: str
    created_at: datetime

class TeamCreate(BaseModel):
    name: str
    players: List[str] # List of Player IDs

class CreateGameRequest(BaseModel):
    name: str
    turn_duration: int
    teams: List[TeamCreate]

class SubmitTurnRequest(BaseModel):
    base_score: int
    bingo: bool

# --------------------
# Helpers
# --------------------
def now() -> datetime:
    return datetime.now(timezone.utc)

def get_game_from_db(conn, game_id: str):
    game = conn.execute("SELECT * FROM games WHERE id = ?", (game_id,)).fetchone()
    if not game:
        raise HTTPException(404, "Game not found")
    return game

def get_teams_from_db(conn, game_id: str):
    teams = conn.execute("SELECT * FROM teams WHERE game_id = ?", (game_id,)).fetchall()
    teams_data = []
    for team in teams:
        players = conn.execute("""
            SELECT p.id, p.name, p.number
            FROM players p
            JOIN game_players gp ON p.id = gp.player_id
            WHERE gp.team_id = ?
        """, (team['id'],)).fetchall()

        teams_data.append({
            "id": team['id'],
            "name": team['name'],
            "score": team['score'],
            "players": [dict(p) for p in players] # Return full player objects
        })
    return teams_data

def get_turns_from_db(conn, game_id: str):
    return conn.execute("SELECT * FROM turns WHERE game_id = ? ORDER BY turn_number ASC", (game_id,)).fetchall()

def calculate_time_left(turn_started_at_iso: Optional[str], turn_duration: int) -> int:
    if not turn_started_at_iso:
        return turn_duration

    # SQLite stores timestamps as strings usually, verify format
    try:
        started_at = datetime.fromisoformat(turn_started_at_iso)
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
    except ValueError:
        # Handle cases where format might vary or if it's already a datetime object (unlikely from raw sqlite row)
        return 0

    elapsed = (now() - started_at).total_seconds()
    return max(0, turn_duration - math.floor(elapsed))

# --------------------
# Routes
# --------------------

@app.get("/players", response_model=List[Player])
def search_players(query: Optional[str] = None):
    conn = get_db_connection()
    if query:
        # Search by name or number
        wildcard = f"%{query}%"
        players = conn.execute(
            "SELECT * FROM players WHERE name LIKE ? OR number LIKE ?",
            (wildcard, wildcard)
        ).fetchall()
    else:
        players = conn.execute("SELECT * FROM players ORDER BY created_at DESC LIMIT 50").fetchall()
    conn.close()
    return [dict(p) for p in players]

@app.post("/players", response_model=Player)
def register_player(req: PlayerCreate):
    conn = get_db_connection()
    try:
        # Check if exists
        existing = conn.execute(
            "SELECT * FROM players WHERE name = ? AND number = ?",
            (req.name, req.number)
        ).fetchone()

        if existing:
            conn.close()
            return dict(existing)

        new_id = str(uuid4())
        conn.execute(
            "INSERT INTO players (id, name, number, created_at) VALUES (?, ?, ?, ?)",
            (new_id, req.name, req.number, now())
        )
        conn.commit()

        player = conn.execute("SELECT * FROM players WHERE id = ?", (new_id,)).fetchone()
        return dict(player)
    except Exception as e:
        conn.close()
        raise HTTPException(400, f"Error registering player: {str(e)}")
    finally:
        conn.close()

@app.get("/history")
def get_history():
    conn = get_db_connection()
    games = conn.execute("SELECT * FROM games WHERE status = 'finished' ORDER BY ended_at DESC").fetchall()

    history = []
    for g in games:
        # Get winner
        teams = conn.execute("SELECT * FROM teams WHERE game_id = ? ORDER BY score DESC", (g['id'],)).fetchall()
        winner = teams[0]['name'] if teams else "Unknown"
        top_score = teams[0]['score'] if teams else 0

        history.append({
            "game_id": g['id'],
            "name": g.get('name', 'Untitled Game'), # Assuming 'name' column exists in games table, if not added, need to check DB schema. I added it in step 1.
            "ended_at": g['ended_at'],
            "winner": winner,
            "top_score": top_score,
            "teams_count": len(teams)
        })
    conn.close()
    return history

@app.post("/games")
def create_game(req: CreateGameRequest):
    conn = get_db_connection()

    # Check for active game? The requirement doesn't strictly forbid multiple games now that we have DB,
    # but the UI might. The previous code did:
    # "Another game already active" check.
    # Since we are moving to persistent DB, supporting multiple games is fine,
    # but for "pass and play" on a single screen, maybe we stick to one active game logic
    # OR we just let the UI manage which ID it is looking at.
    # I'll remove the restriction to allow historical data alongside new games.

    game_id = str(uuid4())
    try:
        conn.execute(
            "INSERT INTO games (id, name, status, turn_duration, turn_started_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (game_id, req.name, "active", req.turn_duration, now(), now())
        )

        for team_req in req.teams:
            team_id = str(uuid4())
            conn.execute(
                "INSERT INTO teams (id, game_id, name, score) VALUES (?, ?, ?, ?)",
                (team_id, game_id, team_req.name, 0)
            )

            for player_id in team_req.players:
                conn.execute(
                    "INSERT INTO game_players (game_id, team_id, player_id) VALUES (?, ?, ?)",
                    (game_id, team_id, player_id)
                )

        conn.commit()
        return {"game_id": game_id, "status": "active"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(400, f"Failed to create game: {str(e)}")
    finally:
        conn.close()

@app.get("/games/{game_id}")
def get_game_state(game_id: str):
    conn = get_db_connection()
    try:
        game = get_game_from_db(conn, game_id)
        teams = get_teams_from_db(conn, game_id)
        turns = get_turns_from_db(conn, game_id)

        # Calculate current turn
        if game['status'] == 'finished':
            current_turn_info = None
        else:
            current_team_idx = game['current_turn_index'] % len(teams)
            current_team = teams[current_team_idx]

            # Identify current player within team
            # We need to rotate players within the team too?
            # Previous logic: "player": team.players[0] -> it just took the first player.
            # Usually scrabble rotates players.
            # If a team has multiple players, do they alternate?
            # The original code just said `player = team.players[0]`.
            # I will stick to that for now, or maybe rotate if I can deduce it.
            # But the 'turns' are per team.
            # Let's assume the first player is the representative for now unless we track player-turns specifically.
            # Wait, `game_players` links multiple players.
            # If I want to be smart:
            # count how many turns this team has taken.
            # team_turns = [t for t in turns if t['team_id'] == current_team['id']]
            # player_idx = len(team_turns) % len(current_team['players'])
            # current_player = current_team['players'][player_idx]

            # Let's implement this rotation logic.
            team_turns_count = conn.execute(
                "SELECT COUNT(*) FROM turns WHERE game_id = ? AND team_id = ?",
                (game_id, current_team['id'])
            ).fetchone()[0]

            players_list = current_team['players']
            if not players_list:
                current_player_name = "Unknown"
            else:
                player_idx = team_turns_count % len(players_list)
                current_player_name = players_list[player_idx]['name']

            current_turn_info = {
                "turn_number": len(turns) + 1,
                "team_id": current_team['id'],
                "player": current_player_name,
                "started_at": game['turn_started_at'],
                "time_left": calculate_time_left(game['turn_started_at'], game['turn_duration'])
            }

        return {
            "game_id": game['id'],
            "status": game['status'],
            "turn_duration": game['turn_duration'],
            "current_turn": current_turn_info,
            "teams": [
                {
                    "id": t['id'],
                    "name": t['name'],
                    "players": [p['name'] for p in t['players']], # Flatten for frontend compatibility if needed, or update frontend
                    "score": t['score']
                }
                for t in teams
            ]
        }
    finally:
        conn.close()

@app.post("/games/{game_id}/turns")
def submit_turn(game_id: str, req: SubmitTurnRequest):
    conn = get_db_connection()
    try:
        game = get_game_from_db(conn, game_id)
        if game['status'] == 'finished':
             raise HTTPException(400, "Game is finished")

        teams = get_teams_from_db(conn, game_id)
        current_team_idx = game['current_turn_index'] % len(teams)
        current_team = teams[current_team_idx]

        # Determine player
        team_turns_count = conn.execute(
            "SELECT COUNT(*) FROM turns WHERE game_id = ? AND team_id = ?",
            (game_id, current_team['id'])
        ).fetchone()[0]
        players_list = current_team['players']
        player_idx = team_turns_count % len(players_list)
        current_player = players_list[player_idx]

        total_score = req.base_score + (50 if req.bingo else 0)

        # Insert turn
        conn.execute(
            """INSERT INTO turns (turn_number, game_id, team_id, player_id, base_score, bingo, total_score, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                game['current_turn_index'] + 1, # using global turn index as turn number? or per game?
                # The previous code used `len(game.turns) + 1`.
                # Here `game['current_turn_index']` tracks total turns.
                game_id,
                current_team['id'],
                current_player['id'],
                req.base_score,
                req.bingo,
                total_score,
                now()
            )
        )

        # Update team score
        conn.execute(
            "UPDATE teams SET score = score + ? WHERE id = ?",
            (total_score, current_team['id'])
        )

        # Update game
        conn.execute(
            "UPDATE games SET current_turn_index = current_turn_index + 1, turn_started_at = ? WHERE id = ?",
            (now(), game_id)
        )

        conn.commit()

        # Return response similar to old API
        # Need next turn info
        # Re-fetch to be safe
        game = get_game_from_db(conn, game_id)
        next_team_idx = game['current_turn_index'] % len(teams)
        next_team = teams[next_team_idx]

        # Calculate next player
        next_team_turns_count = conn.execute(
            "SELECT COUNT(*) FROM turns WHERE game_id = ? AND team_id = ?",
            (game_id, next_team['id'])
        ).fetchone()[0]
        next_players_list = next_team['players']
        next_player_idx = next_team_turns_count % len(next_players_list)
        next_player_name = next_players_list[next_player_idx]['name']

        leaderboard = sorted(
             [{"team_id": t['id'], "name": t['name'], "score": t['score'] + (total_score if t['id'] == current_team['id'] else 0)} for t in teams],
             key=lambda x: x['score'],
             reverse=True
        ) # Actually I updated DB so I should just re-fetch teams for leaderboard

        teams_refreshed = get_teams_from_db(conn, game_id)
        leaderboard = sorted(
             [{"team_id": t['id'], "name": t['name'], "score": t['score']} for t in teams_refreshed],
             key=lambda x: x['score'],
             reverse=True
        )

        return {
            "turn": {
                "turn_number": game['current_turn_index'], # Note: this is the one just submitted
                "team_id": current_team['id'],
                "player": current_player['name'],
                "base_score": req.base_score,
                "bingo": req.bingo,
                "total_score": total_score
            },
            "next_turn": {
                "turn_number": game['current_turn_index'] + 1,
                "team_id": next_team['id'],
                "player": next_player_name,
                "started_at": game['turn_started_at']
            },
            "leaderboard": leaderboard
        }

    finally:
        conn.close()

@app.post("/games/{game_id}/undo")
def undo_last_turn(game_id: str):
    conn = get_db_connection()
    try:
        game = get_game_from_db(conn, game_id)
        # Find last turn
        last_turn = conn.execute(
            "SELECT * FROM turns WHERE game_id = ? ORDER BY id DESC LIMIT 1",
            (game_id,)
        ).fetchone()

        if not last_turn:
            raise HTTPException(400, "No turns to undo")

        # Revert score
        conn.execute(
            "UPDATE teams SET score = score - ? WHERE id = ?",
            (last_turn['total_score'], last_turn['team_id'])
        )

        # Delete turn
        conn.execute("DELETE FROM turns WHERE id = ?", (last_turn['id'],))

        # Update game
        conn.execute(
            "UPDATE games SET current_turn_index = current_turn_index - 1, turn_started_at = ? WHERE id = ?",
            (now(), game_id)
        )

        conn.commit()

        # Construct response
        game = get_game_from_db(conn, game_id) # re-fetch
        teams = get_teams_from_db(conn, game_id)
        current_team_idx = game['current_turn_index'] % len(teams)
        current_team = teams[current_team_idx]

        # Player calculation
        team_turns_count = conn.execute(
            "SELECT COUNT(*) FROM turns WHERE game_id = ? AND team_id = ?",
            (game_id, current_team['id'])
        ).fetchone()[0]
        players_list = current_team['players']
        player_idx = team_turns_count % len(players_list)
        current_player_name = players_list[player_idx]['name']

        return {
            "reverted_turn_number": last_turn['turn_number'], # Assuming this was stored
            "current_turn": {
                "turn_number": game['current_turn_index'] + 1,
                "team_id": current_team['id'],
                "player": current_player_name,
                "started_at": game['turn_started_at']
            },
            "teams": [{"id": t['id'], "score": t['score']} for t in teams]
        }
    finally:
        conn.close()

@app.post("/games/{game_id}/end")
def end_game(game_id: str):
    conn = get_db_connection()
    try:
        conn.execute("UPDATE games SET status = 'finished', ended_at = ? WHERE id = ?", (now(), game_id))
        conn.commit()

        teams = get_teams_from_db(conn, game_id)
        scores = sorted(teams, key=lambda t: t['score'], reverse=True)
        winner = scores[0]['name'] if scores else None

        return {
            "status": "finished",
            "final_scores": [
                {"team": t['name'], "score": t['score']} for t in scores
            ],
            "winner": winner
        }
    finally:
        conn.close()
