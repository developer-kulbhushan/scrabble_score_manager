const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Team {
  name: string;
  players: string[];
}

export interface CreateGameRequest {
  name: string;
  turn_duration: number;
  teams: Team[];
}

export interface CreateGameResponse {
  game_id: string;
  status: string;
}

export interface GameTeam {
  id: string;
  name: string;
  score: number;
  players: string[];
}

export interface CurrentTurn {
  turn_number: number;
  team_id: string;
  player: string;
  started_at: string;
  time_left: number;
}

export interface GameState {
  game_id: string;
  status: string;
  turn_duration: number;
  current_turn: CurrentTurn;
  teams: GameTeam[];
}

export interface SubmitTurnRequest {
  base_score: number;
  bingo: boolean;
}

export interface TurnInfo {
  turn_number: number;
  team_id: string;
  player: string;
  base_score: number;
  bingo: boolean;
  total_score: number;
}

export interface NextTurn {
  turn_number: number;
  team_id: string;
  player: string;
  started_at: string;
}

export interface LeaderboardEntry {
  team_id: string;
  name: string;
  score: number;
}

export interface SubmitTurnResponse {
  turn: TurnInfo;
  next_turn: NextTurn;
  leaderboard: LeaderboardEntry[];
}

export interface UndoResponse {
  reverted_turn_number: number;
  current_turn: {
    turn_number: number;
    team_id: string;
    player: string;
    started_at: string;
  };
  teams: Array<{
    id: string;
    score: number;
  }>;
}

export interface EndGameResponse {
  status: string;
  final_scores: Array<{
    team: string;
    score: number;
  }>;
  winner: string;
}

export const api = {
  async createGame(data: CreateGameRequest): Promise<CreateGameResponse> {
    const response = await fetch(`${API_BASE_URL}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create game');
    return response.json();
  },

  async getGameState(gameId: string): Promise<GameState> {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}`);
    if (!response.ok) throw new Error('Failed to fetch game state');
    return response.json();
  },

  async submitTurn(gameId: string, data: SubmitTurnRequest): Promise<SubmitTurnResponse> {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/turns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to submit turn');
    return response.json();
  },

  async undoLastTurn(gameId: string): Promise<UndoResponse> {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/undo`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to undo turn');
    return response.json();
  },

  async endGame(gameId: string): Promise<EndGameResponse> {
    const response = await fetch(`${API_BASE_URL}/games/${gameId}/end`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to end game');
    return response.json();
  },
};
