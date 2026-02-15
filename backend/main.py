from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID, uuid4
from datetime import datetime, timezone
import math
import sqlite3
from database import init_db, get_db_connection, execute_query

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

class PlayerStats(BaseModel):
    player_id: str
    name: str
    number: str
    total_games: int
    wins: int
    win_rate: float
    avg_score: float
    high_score_solo: int
    high_score_duo: int
    high_score_trio: int
    high_score_group: int # >3 players

# --------------------
# Helpers
# --------------------
def now() -> datetime:
    return datetime.now(timezone.utc)

def get_game_from_db(conn, game_id: str):
    game = execute_query(conn, "SELECT * FROM games WHERE id = ?", (game_id,)).fetchone()
    if not game:
        raise HTTPException(404, "Game not found")
    return game

def get_teams_from_db(conn, game_id: str):
    teams = execute_query(conn, "SELECT * FROM teams WHERE game_id = ?", (game_id,)).fetchall()
    teams_data = []
    for team in teams:
        players = execute_query(conn, """
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
    return execute_query(conn, "SELECT * FROM turns WHERE game_id = ? ORDER BY turn_number ASC", (game_id,)).fetchall()

def calculate_time_left(turn_started_at_iso: Optional[str], turn_duration: int) -> int:
    if not turn_started_at_iso:
        return turn_duration

    try:
        started_at = datetime.fromisoformat(turn_started_at_iso)
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
    except ValueError:
        return 0

    elapsed = (now() - started_at).total_seconds()
    return max(0, turn_duration - math.floor(elapsed))

# --------------------
# Routes
# --------------------

@app.get("/players", response_model=List[Player])
def search_players(query: Optional[str] = None):
    conn = get_db_connection()
    try:
        if query:
            wildcard = f"%{query}%"
            players = execute_query(conn,
                "SELECT * FROM players WHERE name LIKE ? OR number LIKE ?",
                (wildcard, wildcard)
            ).fetchall()
        else:
            players = execute_query(conn, "SELECT * FROM players ORDER BY created_at DESC LIMIT 50").fetchall()
        return [dict(p) for p in players]
    finally:
        conn.close()

@app.post("/players", response_model=Player)
def register_player(req: PlayerCreate):
    conn = get_db_connection()
    try:
        existing = execute_query(conn,
            "SELECT * FROM players WHERE name = ? AND number = ?",
            (req.name, req.number)
        ).fetchone()

        if existing:
            return dict(existing)

        new_id = str(uuid4())
        execute_query(conn,
            "INSERT INTO players (id, name, number, created_at) VALUES (?, ?, ?, ?)",
            (new_id, req.name, req.number, now())
        )
        conn.commit()

        player = execute_query(conn, "SELECT * FROM players WHERE id = ?", (new_id,)).fetchone()
        return dict(player)
    except Exception as e:
        raise HTTPException(400, f"Error registering player: {str(e)}")
    finally:
        conn.close()

@app.get("/stats/players/{player_id}", response_model=PlayerStats)
def get_player_stats(player_id: str):
    conn = get_db_connection()
    try:
        player = execute_query(conn, "SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
        if not player:
            raise HTTPException(404, "Player not found")

        # Get all games/teams this player participated in
        # We need teams where player was involved, and the game must be finished
        rows = execute_query(conn, """
            SELECT g.id as game_id, t.id as team_id, t.score as team_score,
                   (SELECT COUNT(*) FROM game_players gp2 WHERE gp2.team_id = t.id) as team_size,
                   (SELECT MAX(t2.score) FROM teams t2 WHERE t2.game_id = g.id) as winning_score
            FROM game_players gp
            JOIN teams t ON gp.team_id = t.id
            JOIN games g ON t.game_id = g.id
            WHERE gp.player_id = ? AND g.status = 'finished'
        """, (player_id,)).fetchall()

        total_games = len(rows)
        wins = 0
        total_score = 0

        high_score_solo = 0
        high_score_duo = 0
        high_score_trio = 0
        high_score_group = 0

        for row in rows:
            score = row['team_score']
            total_score += score
            if score == row['winning_score'] and score > 0: # Tie counts as win? Yes.
                 wins += 1

            size = row['team_size']
            if size == 1:
                high_score_solo = max(high_score_solo, score)
            elif size == 2:
                high_score_duo = max(high_score_duo, score)
            elif size == 3:
                high_score_trio = max(high_score_trio, score)
            else:
                high_score_group = max(high_score_group, score)

        avg_score = total_score / total_games if total_games > 0 else 0
        win_rate = (wins / total_games * 100) if total_games > 0 else 0

        return {
            "player_id": player['id'],
            "name": player['name'],
            "number": player['number'],
            "total_games": total_games,
            "wins": wins,
            "win_rate": round(win_rate, 1),
            "avg_score": round(avg_score, 1),
            "high_score_solo": high_score_solo,
            "high_score_duo": high_score_duo,
            "high_score_trio": high_score_trio,
            "high_score_group": high_score_group
        }

    finally:
        conn.close()

@app.get("/history")
def get_history():
    conn = get_db_connection()
    try:
        games = execute_query(conn, "SELECT * FROM games WHERE status = 'finished' ORDER BY ended_at DESC").fetchall()

        history = []
        for g in games:
            teams = execute_query(conn, "SELECT * FROM teams WHERE game_id = ? ORDER BY score DESC", (g['id'],)).fetchall()
            winner = teams[0]['name'] if teams else "Unknown"
            top_score = teams[0]['score'] if teams else 0

            winner_players = []
            if teams:
                 winner_team_id = teams[0]['id']
                 wp_rows = execute_query(conn, """
                    SELECT p.name FROM players p
                    JOIN game_players gp ON p.id = gp.player_id
                    WHERE gp.team_id = ?
                 """, (winner_team_id,)).fetchall()
                 winner_players = [r['name'] for r in wp_rows]

            history.append({
                "game_id": g['id'],
                "name": g['name'],
                "ended_at": g['ended_at'],
                "winner": winner,
                "winner_players": winner_players, # Added field
                "top_score": top_score,
                "teams_count": len(teams)
            })
        return history
    finally:
        conn.close()

@app.post("/games")
def create_game(req: CreateGameRequest):
    conn = get_db_connection()
    game_id = str(uuid4())
    try:
        execute_query(conn,
            "INSERT INTO games (id, name, status, turn_duration, turn_started_at, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (game_id, req.name, "active", req.turn_duration, now(), now())
        )

        for team_req in req.teams:
            team_id = str(uuid4())
            execute_query(conn,
                "INSERT INTO teams (id, game_id, name, score) VALUES (?, ?, ?, ?)",
                (team_id, game_id, team_req.name, 0)
            )

            for player_id in team_req.players:
                execute_query(conn,
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

        if game['status'] == 'finished':
            current_turn_info = None
        else:
            current_team_idx = game['current_turn_index'] % len(teams)
            current_team = teams[current_team_idx]

            team_turns_count = execute_query(conn,
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
                    "players": [p['name'] for p in t['players']],
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

        team_turns_count = execute_query(conn,
            "SELECT COUNT(*) FROM turns WHERE game_id = ? AND team_id = ?",
            (game_id, current_team['id'])
        ).fetchone()[0]
        players_list = current_team['players']
        player_idx = team_turns_count % len(players_list)
        current_player = players_list[player_idx]

        total_score = req.base_score + (50 if req.bingo else 0)

        execute_query(conn,
            """INSERT INTO turns (turn_number, game_id, team_id, player_id, base_score, bingo, total_score, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                game['current_turn_index'] + 1,
                game_id,
                current_team['id'],
                current_player['id'],
                req.base_score,
                req.bingo,
                total_score,
                now()
            )
        )

        execute_query(conn,
            "UPDATE teams SET score = score + ? WHERE id = ?",
            (total_score, current_team['id'])
        )

        execute_query(conn,
            "UPDATE games SET current_turn_index = current_turn_index + 1, turn_started_at = ? WHERE id = ?",
            (now(), game_id)
        )

        conn.commit()

        game = get_game_from_db(conn, game_id)
        next_team_idx = game['current_turn_index'] % len(teams)
        next_team = teams[next_team_idx]

        next_team_turns_count = execute_query(conn,
            "SELECT COUNT(*) FROM turns WHERE game_id = ? AND team_id = ?",
            (game_id, next_team['id'])
        ).fetchone()[0]
        next_players_list = next_team['players']
        next_player_idx = next_team_turns_count % len(next_players_list)
        next_player_name = next_players_list[next_player_idx]['name']

        teams_refreshed = get_teams_from_db(conn, game_id)
        leaderboard = sorted(
             [{"team_id": t['id'], "name": t['name'], "score": t['score']} for t in teams_refreshed],
             key=lambda x: x['score'],
             reverse=True
        )

        return {
            "turn": {
                "turn_number": game['current_turn_index'],
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
        last_turn = execute_query(conn,
            "SELECT * FROM turns WHERE game_id = ? ORDER BY id DESC LIMIT 1",
            (game_id,)
        ).fetchone()

        if not last_turn:
            raise HTTPException(400, "No turns to undo")

        execute_query(conn,
            "UPDATE teams SET score = score - ? WHERE id = ?",
            (last_turn['total_score'], last_turn['team_id'])
        )

        execute_query(conn, "DELETE FROM turns WHERE id = ?", (last_turn['id'],))

        execute_query(conn,
            "UPDATE games SET current_turn_index = current_turn_index - 1, turn_started_at = ? WHERE id = ?",
            (now(), game_id)
        )

        conn.commit()

        game = get_game_from_db(conn, game_id)
        teams = get_teams_from_db(conn, game_id)
        current_team_idx = game['current_turn_index'] % len(teams)
        current_team = teams[current_team_idx]

        team_turns_count = execute_query(conn,
            "SELECT COUNT(*) FROM turns WHERE game_id = ? AND team_id = ?",
            (game_id, current_team['id'])
        ).fetchone()[0]
        players_list = current_team['players']
        player_idx = team_turns_count % len(players_list)
        current_player_name = players_list[player_idx]['name']

        return {
            "reverted_turn_number": last_turn['turn_number'],
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
        execute_query(conn, "UPDATE games SET status = 'finished', ended_at = ? WHERE id = ?", (now(), game_id))
        conn.commit()

        teams = get_teams_from_db(conn, game_id)
        scores = sorted(teams, key=lambda t: t['score'], reverse=True)
        winner = scores[0]['name'] if scores else None

        return {
            "status": "finished",
            "final_scores": [
                {
                    "team": t['name'],
                    "score": t['score'],
                    "players": [p['name'] for p in t['players']] # Include players!
                } for t in scores
            ],
            "winner": winner
        }
    finally:
        conn.close()
