import { useState, useEffect } from 'react';
import { Trophy, Undo2, Timer, Star } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { api } from '../utils/api';
import { useGame } from '../context/GameContext';

export function ActiveGame() {
  const { gameId, gameState, setGameState, setCurrentScreen, setEndGameData } = useGame();
  const [baseScore, setBaseScore] = useState('');
  const [bingo, setBingo] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (gameId) {
      loadGameState();
    }
  }, [gameId]);

  useEffect(() => {
    if (gameState?.current_turn) {
      setTimeLeft(gameState.current_turn.time_left);
    }
  }, [gameState]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const loadGameState = async () => {
    if (!gameId) return;
    try {
      const state = await api.getGameState(gameId);
      setGameState(state);
    } catch (err) {
      setError('Failed to load game state');
    }
  };

  const handleSubmitTurn = async () => {
    if (!gameId || !baseScore) return;

    setLoading(true);
    setError('');
    try {
      const response = await api.submitTurn(gameId, {
        base_score: parseInt(baseScore),
        bingo,
      });

      setGameState((prev) =>
        prev
          ? {
              ...prev,
              current_turn: {
                ...response.next_turn,
                time_left: prev.turn_duration,
              },
              teams: response.leaderboard.map((entry) => {
                const team = prev.teams.find((t) => t.id === entry.team_id);
                return team ? { ...team, score: entry.score } : team!;
              }),
            }
          : null
      );

      setBaseScore('');
      setBingo(false);
      setTimeLeft(gameState?.turn_duration || 0);
    } catch (err) {
      setError('Failed to submit turn');
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!gameId) return;

    setLoading(true);
    setError('');
    try {
      const response = await api.undoLastTurn(gameId);

      setGameState((prev) =>
        prev
          ? {
              ...prev,
              current_turn: {
                ...response.current_turn,
                time_left: prev.turn_duration,
              },
              teams: prev.teams.map((team) => {
                const updatedTeam = response.teams.find((t) => t.id === team.id);
                return updatedTeam ? { ...team, score: updatedTeam.score } : team;
              }),
            }
          : null
      );

      setTimeLeft(gameState?.turn_duration || 0);
    } catch (err) {
      setError('Failed to undo turn');
    } finally {
      setLoading(false);
    }
  };

  const handleEndGame = async () => {
    if (!gameId) return;
    setLoading(true);
    try {
      const response = await api.endGame(gameId);
      setEndGameData(response);
      setCurrentScreen('gameover');
    } catch (err) {
      setError('Failed to end game');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTeam = gameState?.teams.find(
    (t) => t.id === gameState.current_turn.team_id
  );

  const timerColor =
    timeLeft <= 0
      ? 'text-red-600'
      : timeLeft <= 10
      ? 'text-orange-500'
      : 'text-green-600';

  const sortedTeams = [...(gameState?.teams || [])].sort((a, b) => b.score - a.score);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-20">
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-lg z-10 p-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <button
            onClick={() => setShowScoreboard(!showScoreboard)}
            className="flex items-center gap-2 text-blue-600 font-semibold min-h-[44px] px-4 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Trophy className="w-5 h-5" />
            Scoreboard
          </button>
          <button
            onClick={handleEndGame}
            className="text-red-600 font-semibold min-h-[44px] px-4 hover:bg-red-50 rounded-lg transition-colors"
          >
            End Game
          </button>
        </div>
      </div>

      {showScoreboard && (
        <div
          className="fixed inset-0 bg-black/50 z-20 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowScoreboard(false)}
        >
          <Card className="max-w-md w-full animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Leaderboard
            </h2>
            <div className="space-y-3">
              {sortedTeams.map((team, index) => (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                    index === 0
                      ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 shadow-md'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-2xl font-bold ${
                        index === 0
                          ? 'text-yellow-600'
                          : index === 1
                          ? 'text-gray-500'
                          : index === 2
                          ? 'text-orange-600'
                          : 'text-gray-400'
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-800">{team.name}</p>
                      <p className="text-sm text-gray-600">
                        {team.players.join(', ')}
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    {team.score}
                  </span>
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              size="lg"
              className="w-full mt-6"
              onClick={() => setShowScoreboard(false)}
            >
              Close
            </Button>
          </Card>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <Card className="text-center animate-slideIn">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Timer className={`w-8 h-8 ${timerColor}`} />
            <div className={`text-6xl font-bold ${timerColor} transition-colors duration-300`}>
              {formatTime(timeLeft)}
            </div>
          </div>
          {timeLeft <= 0 && (
            <p className="text-red-600 font-semibold animate-pulse">Time's Up!</p>
          )}
        </Card>

        <Card className="text-center space-y-2 animate-slideIn bg-gradient-to-br from-blue-50 to-white">
          <div className="flex items-center justify-center gap-2">
            <Star className="w-6 h-6 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-800">{currentTeam?.name}</h2>
          </div>
          <p className="text-xl text-gray-600">
            {gameState.current_turn.player}
          </p>
          <p className="text-sm text-gray-500">
            Turn {gameState.current_turn.turn_number}
          </p>
          <div className="pt-2">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-semibold">
              Current Score: {currentTeam?.score || 0}
            </span>
          </div>
        </Card>

        <Card className="space-y-4 animate-slideIn">
          <h3 className="text-lg font-semibold text-gray-800">Score This Turn</h3>

          <Input
            label="Base Score"
            type="number"
            placeholder="0"
            value={baseScore}
            onChange={(e) => setBaseScore(e.target.value)}
            min="0"
          />

          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl">
            <div className="flex items-center gap-2">
              <Star className="w-6 h-6 text-green-600" />
              <span className="font-semibold text-gray-800">Bingo! (+50)</span>
            </div>
            <button
              onClick={() => setBingo(!bingo)}
              className={`w-16 h-9 rounded-full transition-all duration-300 min-h-[44px] ${
                bingo
                  ? 'bg-gradient-to-r from-green-500 to-green-600'
                  : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-7 h-7 bg-white rounded-full shadow-lg transition-transform duration-300 ${
                  bingo ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {baseScore && (
            <div className="text-center p-4 bg-blue-50 rounded-xl animate-scaleIn">
              <p className="text-sm text-gray-600 mb-1">Total Score</p>
              <p className="text-4xl font-bold text-blue-600">
                {parseInt(baseScore) + (bingo ? 50 : 0)}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleUndo}
              disabled={loading || gameState.current_turn.turn_number === 1}
              className="flex-1"
            >
              <Undo2 className="w-5 h-5 mr-2" />
              Undo
            </Button>
            <Button
              variant="success"
              size="lg"
              onClick={handleSubmitTurn}
              disabled={loading || !baseScore || timeLeft <= 0}
              className="flex-1"
            >
              Submit Turn
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
