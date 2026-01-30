import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { api, Team } from '../utils/api';
import { useGame } from '../context/GameContext';

interface TeamState extends Team {
  id: string;
}

export function GameSetup() {
  const { setGameId, setCurrentScreen } = useGame();
  const [gameName, setGameName] = useState('');
  const [turnDuration, setTurnDuration] = useState('60');
  const [teams, setTeams] = useState<TeamState[]>([
    { id: '1', name: '', players: [''] },
    { id: '2', name: '', players: [''] },
  ]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addTeam = () => {
    setTeams([...teams, { id: Date.now().toString(), name: '', players: [''] }]);
  };

  const removeTeam = (teamId: string) => {
    if (teams.length > 2) {
      setTeams(teams.filter((t) => t.id !== teamId));
    }
  };

  const updateTeamName = (teamId: string, name: string) => {
    setTeams(teams.map((t) => (t.id === teamId ? { ...t, name } : t)));
  };

  const addPlayer = (teamId: string) => {
    setTeams(
      teams.map((t) =>
        t.id === teamId ? { ...t, players: [...t.players, ''] } : t
      )
    );
  };

  const removePlayer = (teamId: string, playerIndex: number) => {
    setTeams(
      teams.map((t) =>
        t.id === teamId
          ? { ...t, players: t.players.filter((_, i) => i !== playerIndex) }
          : t
      )
    );
  };

  const updatePlayer = (teamId: string, playerIndex: number, name: string) => {
    setTeams(
      teams.map((t) =>
        t.id === teamId
          ? {
              ...t,
              players: t.players.map((p, i) => (i === playerIndex ? name : p)),
            }
          : t
      )
    );
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!gameName.trim()) {
      newErrors.push('Game name is required');
    }

    if (teams.length < 2) {
      newErrors.push('At least 2 teams are required');
    }

    teams.forEach((team, index) => {
      if (!team.name.trim()) {
        newErrors.push(`Team ${index + 1} name is required`);
      }
      const validPlayers = team.players.filter((p) => p.trim());
      if (validPlayers.length === 0) {
        newErrors.push(`Team ${index + 1} must have at least 1 player`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const cleanedTeams: Team[] = teams.map((team) => ({
        name: team.name.trim(),
        players: team.players.filter((p) => p.trim()).map((p) => p.trim()),
      }));

      const response = await api.createGame({
        name: gameName.trim(),
        turn_duration: parseInt(turnDuration),
        teams: cleanedTeams,
      });

      setGameId(response.game_id);
      setCurrentScreen('active');
    } catch (error) {
      setErrors(['Failed to create game. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4 pb-8">
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <div className="text-center py-6">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Scrabble Scorer</h1>
          <p className="text-gray-600">Set up your game to get started</p>
        </div>

        <Card>
          <div className="space-y-4">
            <Input
              label="Game Name"
              type="text"
              placeholder="Friday Night Scrabble"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
            />

            <Input
              label="Turn Duration (seconds)"
              type="number"
              placeholder="60"
              value={turnDuration}
              onChange={(e) => setTurnDuration(e.target.value)}
              min="10"
            />
          </div>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Teams
            </h2>
            <Button size="sm" onClick={addTeam}>
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          {teams.map((team, teamIndex) => (
            <Card key={team.id} className="animate-slideIn">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-700">
                    Team {teamIndex + 1}
                  </h3>
                  {teams.length > 2 && (
                    <button
                      onClick={() => removeTeam(team.id)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors min-h-[44px] min-w-[44px]"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <Input
                  placeholder="Team name"
                  value={team.name}
                  onChange={(e) => updateTeamName(team.id, e.target.value)}
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Players
                  </label>
                  {team.players.map((player, playerIndex) => (
                    <div key={playerIndex} className="flex gap-2">
                      <Input
                        placeholder={`Player ${playerIndex + 1}`}
                        value={player}
                        onChange={(e) =>
                          updatePlayer(team.id, playerIndex, e.target.value)
                        }
                      />
                      {team.players.length > 1 && (
                        <button
                          onClick={() => removePlayer(team.id, playerIndex)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors min-h-[48px] min-w-[48px] flex-shrink-0"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => addPlayer(team.id)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Player
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {errors.length > 0 && (
          <Card className="bg-red-50 border-2 border-red-200">
            <div className="space-y-1">
              {errors.map((error, index) => (
                <p key={index} className="text-red-700 text-sm">
                  • {error}
                </p>
              ))}
            </div>
          </Card>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Creating Game...' : 'Start Game'}
        </Button>
      </div>
    </div>
  );
}
