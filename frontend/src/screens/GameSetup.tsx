import { useState } from 'react';
import { Plus, Trash2, Users, ArrowLeft, X } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { api, Team, Player } from '../utils/api';
import { useGame } from '../context/GameContext';
import { PlayerSearch } from '../components/PlayerSearch';
import { PlayerRegistration } from '../components/PlayerRegistration';

interface TeamState {
  id: string;
  name: string;
  players: Player[];
}

export function GameSetup() {
  const { setGameId, setCurrentScreen } = useGame();

  // Default name logic updated as per request
  const [gameName, setGameName] = useState(() => {
    const now = new Date();
    return now.toLocaleString();
  });

  const [turnDuration, setTurnDuration] = useState('60');
  const [teams, setTeams] = useState<TeamState[]>([
    { id: '1', name: 'Team 1', players: [] },
    { id: '2', name: 'Team 2', players: [] },
  ]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Registration Modal State
  const [showRegistration, setShowRegistration] = useState(false);
  const [pendingRegistrationTeamId, setPendingRegistrationTeamId] = useState<string | null>(null);
  const [registrationName, setRegistrationName] = useState('');

  const addTeam = () => {
    setTeams([...teams, { id: Date.now().toString(), name: `Team ${teams.length + 1}`, players: [] }]);
  };

  const removeTeam = (teamId: string) => {
    if (teams.length > 2) {
      setTeams(teams.filter((t) => t.id !== teamId));
    }
  };

  const updateTeamName = (teamId: string, name: string) => {
    setTeams(teams.map((t) => (t.id === teamId ? { ...t, name } : t)));
  };

  const addPlayerToTeam = (teamId: string, player: Player) => {
    setTeams(teams.map(t => {
      if (t.id === teamId) {
        // Prevent duplicates in same team
        if (t.players.find(p => p.id === player.id)) return t;
        return { ...t, players: [...t.players, player] };
      }
      return t;
    }));
  };

  const removePlayerFromTeam = (teamId: string, playerId: string) => {
    setTeams(teams.map(t =>
      t.id === teamId
        ? { ...t, players: t.players.filter(p => p.id !== playerId) }
        : t
    ));
  };

  const handleCreateNew = (teamId: string, name: string) => {
      setPendingRegistrationTeamId(teamId);
      setRegistrationName(name);
      setShowRegistration(true);
  };

  const handleRegistrationSuccess = (player: Player) => {
      if (pendingRegistrationTeamId) {
          addPlayerToTeam(pendingRegistrationTeamId, player);
      }
      setPendingRegistrationTeamId(null);
  };

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!gameName.trim()) {
      newErrors.push('Game name is required');
    }

    if (teams.length < 2) {
      newErrors.push('At least 2 teams are required');
    }

    // Validation Check: all teams must have at least 1 player
    teams.forEach((team, index) => {
      if (!team.name.trim()) {
        newErrors.push(`Team ${index + 1} name is required`);
      }
      if (team.players.length === 0) {
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
        players: team.players.map(p => p.id),
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
        <div className="flex items-center gap-4 py-6">
          <Button variant="secondary" onClick={() => setCurrentScreen('home')} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1 text-center">
             <h1 className="text-4xl font-bold text-gray-800 mb-2">New Game</h1>
             <p className="text-gray-600">Configure teams and players</p>
          </div>
          <div className="w-20" /> {/* Spacer */}
        </div>

        <Card>
          <div className="space-y-4">
            <Input
              label="Game Name"
              type="text"
              placeholder="Game Name"
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
                    Players <span className="text-red-500">*</span>
                  </label>

                  <div className="space-y-2">
                      {team.players.map((player) => (
                        <div key={player.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                           <div className="flex items-center gap-2">
                              <span className="font-medium">{player.name}</span>
                              <span className="text-xs text-gray-500">#{player.number}</span>
                           </div>
                           <button
                             onClick={() => removePlayerFromTeam(team.id, player.id)}
                             className="text-red-400 hover:text-red-600 p-1"
                           >
                             <X className="w-4 h-4" />
                           </button>
                        </div>
                      ))}
                  </div>

                  <PlayerSearch
                    placeholder="Search or add player..."
                    onSelect={(player) => addPlayerToTeam(team.id, player)}
                    onCreateNew={(name) => handleCreateNew(team.id, name)}
                  />
                  {team.players.length === 0 && (
                      <p className="text-xs text-amber-600">At least one player required.</p>
                  )}
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

      <PlayerRegistration
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        onSuccess={handleRegistrationSuccess}
        initialName={registrationName}
      />
    </div>
  );
}
