from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
from uuid import UUID, uuid4
from datetime import datetime, timezone
import math

app = FastAPI()

# CORS configuration
origins = [
    "https://scrabble-score-manager-frontend.vercel.app",
    "http://localhost:3000",   # optional for local dev
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --------------------
# In-memory store
# --------------------
GAMES: Dict[UUID, "Game"] = {}

# --------------------
# Input models
# --------------------
class TeamCreate(BaseModel):
    name: str
    players: List[str]


class CreateGameRequest(BaseModel):
    name: str
    turn_duration: int
    teams: List[TeamCreate]


class SubmitTurnRequest(BaseModel):
    base_score: int
    bingo: bool


# --------------------
# Internal models
# --------------------
class Team(BaseModel):
    id: UUID
    name: str
    players: List[str]
    score: int = 0


class Turn(BaseModel):
    turn_number: int
    team_id: UUID
    player: str
    base_score: int
    bingo: bool
    total_score: int
    timestamp: datetime


class Game(BaseModel):
    id: UUID
    status: str
    turn_duration: int
    teams: List[Team]
    turns: List[Turn] = []
    current_turn_index: int = 0
    turn_started_at: datetime


# --------------------
# Helpers
# --------------------
def now() -> datetime:
    return datetime.now(timezone.utc)


def get_game(game_id: UUID) -> Game:
    game = GAMES.get(game_id)
    if not game:
        raise HTTPException(404, "Game not found")
    if game.status == "finished":
        raise HTTPException(400, "Game already finished")
    return game


def time_left(game: Game) -> int:
    elapsed = (now() - game.turn_started_at).total_seconds()
    return max(0, game.turn_duration - math.floor(elapsed))


def current_team(game: Game) -> Team:
    return game.teams[game.current_turn_index % len(game.teams)]


def leaderboard(game: Game):
    return sorted(
        [
            {"team_id": str(t.id), "name": t.name, "score": t.score}
            for t in game.teams
        ],
        key=lambda x: x["score"],
        reverse=True,
    )


# --------------------
# Routes
# --------------------
@app.post("/games")
def create_game(req: CreateGameRequest):
    for g in GAMES.values():
        if g.status != "finished":
            raise HTTPException(400, "Another game already active")

    teams = [
        Team(id=uuid4(), name=t.name, players=t.players)
        for t in req.teams
    ]

    game_id = uuid4()
    game = Game(
        id=game_id,
        status="active",
        turn_duration=req.turn_duration,
        teams=teams,
        turn_started_at=now(),
    )

    GAMES[game_id] = game

    return {
        "game_id": str(game_id),
        "status": game.status,
    }


@app.get("/games/{game_id}")
def get_game_state(game_id: UUID):
    game = get_game(game_id)
    team = current_team(game)

    return {
        "game_id": str(game.id),
        "status": game.status,
        "turn_duration": game.turn_duration,
        "current_turn": {
            "turn_number": len(game.turns) + 1,
            "team_id": str(team.id),
            "player": team.players[0],
            "started_at": game.turn_started_at.isoformat(),
            "time_left": time_left(game),
        },
        "teams": [
            {
                "id": str(t.id),
                "name": t.name,
                "players": t.players,
                "score": t.score,
            }
            for t in game.teams
        ],
    }


@app.post("/games/{game_id}/turns")
def submit_turn(game_id: UUID, req: SubmitTurnRequest):
    game = get_game(game_id)

    if time_left(game) <= 0:
        raise HTTPException(400, "Turn timer expired")

    team = current_team(game)
    player = team.players[0]
    total_score = req.base_score + (50 if req.bingo else 0)

    turn = Turn(
        turn_number=len(game.turns) + 1,
        team_id=team.id,
        player=player,
        base_score=req.base_score,
        bingo=req.bingo,
        total_score=total_score,
        timestamp=now(),
    )

    game.turns.append(turn)
    team.score += total_score

    game.current_turn_index += 1
    game.turn_started_at = now()

    next_team = current_team(game)

    return {
        "turn": {
            **turn.dict(exclude={"timestamp"}),
        },
        "next_turn": {
            "turn_number": len(game.turns) + 1,
            "team_id": str(next_team.id),
            "player": next_team.players[0],
            "started_at": game.turn_started_at.isoformat(),
        },
        "leaderboard": leaderboard(game),
    }


@app.post("/games/{game_id}/undo")
def undo_last_turn(game_id: UUID):
    game = get_game(game_id)

    if not game.turns:
        raise HTTPException(400, "No turns to undo")

    last = game.turns.pop()

    for t in game.teams:
        if t.id == last.team_id:
            t.score -= last.total_score

    game.current_turn_index -= 1
    game.turn_started_at = now()

    team = current_team(game)

    return {
        "reverted_turn_number": last.turn_number,
        "current_turn": {
            "turn_number": len(game.turns) + 1,
            "team_id": str(team.id),
            "player": team.players[0],
            "started_at": game.turn_started_at.isoformat(),
        },
        "teams": [
            {"id": str(t.id), "score": t.score}
            for t in game.teams
        ],
    }


@app.post("/games/{game_id}/end")
def end_game(game_id: UUID):
    game = get_game(game_id)
    game.status = "finished"

    scores = sorted(game.teams, key=lambda t: t.score, reverse=True)
    winner = scores[0].name if scores else None

    return {
        "status": "finished",
        "final_scores": [
            {"team": t.name, "score": t.score} for t in scores
        ],
        "winner": winner,
    }
