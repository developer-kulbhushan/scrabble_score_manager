const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Team {
  name: string;
  players: string[]; // List of Player IDs
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
  players: string[]; // List of player names
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
    players: string[];
  }>;
  winner: string;
}

export interface Player {
  id: string;
  name: string;
  number: string;
  created_at: string;
}

export interface PlayerStats {
  player_id: string;
  name: string;
  number: string;
  total_games: number;
  wins: number;
  win_rate: number;
  avg_score: number;
  high_score_solo: number;
  high_score_duo: number;
  high_score_trio: number;
  high_score_group: number;
}

export interface HistoryEntry {
  game_id: string;
  name: string;
  ended_at: string;
  winner: string;
  winner_players: string[];
  top_score: number;
  teams_count: number;
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

  async getPlayers(query?: string): Promise<Player[]> {
    const url = new URL(`${API_BASE_URL}/players`);
    if (query) {
      url.searchParams.append('query', query);
    }
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to fetch players');
    return response.json();
  },

  async registerPlayer(name: string, number: string): Promise<Player> {
    const response = await fetch(`${API_BASE_URL}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, number }),
    });
    if (!response.ok) throw new Error('Failed to register player');
    return response.json();
  },

  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const response = await fetch(`${API_BASE_URL}/stats/players/${playerId}`);
    if (!response.ok) throw new Error('Failed to fetch player stats');
    return response.json();
  },

  async getHistory(): Promise<HistoryEntry[]> {
    const response = await fetch(`${API_BASE_URL}/history`);
    if (!response.ok) throw new Error('Failed to fetch history');
    return response.json();
  },
};
