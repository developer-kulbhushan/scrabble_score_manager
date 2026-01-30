import { useEffect, useState } from 'react';
import { Play, UserPlus, Trophy, History } from 'lucide-react';
import { Card } from '../components/Card';
import { api, HistoryEntry, Player } from '../utils/api';
import { useGame } from '../context/GameContext';
import { PlayerRegistration } from '../components/PlayerRegistration';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export function Home() {
  const { setCurrentScreen } = useGame();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showRegistration, setShowRegistration] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHistory()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePlayerRegistered = (player: Player) => {
    alert(`Player ${player.name} (#${player.number}) registered!`);
  };

  // Prepare data for chart: Last 10 games
  const chartData = history.slice(0, 10).map(game => ({
    name: game.winner,
    score: game.top_score,
    game: game.name || 'Game'
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4 pb-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
        <div className="text-center py-10">
          <h1 className="text-5xl font-bold text-gray-800 mb-4 tracking-tight">Scrabble Portal</h1>
          <p className="text-xl text-gray-600">Track scores, analyze history, and manage players.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-8 flex flex-col items-center justify-center text-center hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-100" onClick={() => setCurrentScreen('setup')}>
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <Play className="w-8 h-8 text-blue-600 ml-1" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Start New Game</h2>
            <p className="text-gray-500">Configure teams and start tracking scores</p>
          </Card>

          <Card className="p-8 flex flex-col items-center justify-center text-center hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-green-100" onClick={() => setShowRegistration(true)}>
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <UserPlus className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Register Player</h2>
            <p className="text-gray-500">Add new players to the roster</p>
          </Card>
        </div>

        {/* Historical Analysis */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-800">Historical Analysis</h2>
          </div>

          <Card>
            <div className="h-[300px] w-full">
               {history.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={chartData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
                     <XAxis dataKey="game" tick={{fontSize: 12}} interval={0} angle={-45} textAnchor="end" height={60} />
                     <YAxis />
                     <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-2 border shadow-sm rounded text-black">
                                <p className="font-bold">{data.game}</p>
                                <p className="text-sm">Winner: {data.name}</p>
                                <p className="text-sm">Score: {data.score}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                     />
                     <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Winning Score" />
                   </BarChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="h-full flex items-center justify-center text-gray-400">
                   No games played yet
                 </div>
               )}
            </div>
          </Card>

          <div className="flex items-center gap-2 pt-4">
            <History className="w-6 h-6 text-gray-600" />
            <h2 className="text-2xl font-bold text-gray-800">Recent Games</h2>
          </div>

          <div className="grid gap-4">
            {history.length === 0 && !loading && (
               <p className="text-gray-500 italic">No history available.</p>
            )}
            {history.map((game) => (
              <Card key={game.game_id} className="flex justify-between items-center p-4">
                <div>
                  <h3 className="font-bold text-gray-800">{game.name}</h3>
                  <p className="text-sm text-gray-500">{new Date(game.ended_at).toLocaleDateString()} • {game.teams_count} Teams</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Winner</p>
                  <p className="font-bold text-green-600">{game.winner}</p>
                  <p className="text-xs text-gray-400">{game.top_score} pts</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <PlayerRegistration
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        onSuccess={handlePlayerRegistered}
      />
    </div>
  );
}
