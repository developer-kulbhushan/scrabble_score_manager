import { useState, useEffect } from 'react';
import { ArrowLeft, User, Trophy, BarChart3, Calculator, Users } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useGame } from '../context/GameContext';
import { PlayerSearch } from '../components/PlayerSearch';
import { api, Player, PlayerStats as IPlayerStats } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export function PlayerStats() {
  const { setCurrentScreen } = useGame();

  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);

  const [stats1, setStats1] = useState<IPlayerStats | null>(null);
  const [stats2, setStats2] = useState<IPlayerStats | null>(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  useEffect(() => {
    if (player1) {
      setLoading1(true);
      api.getPlayerStats(player1.id)
        .then(setStats1)
        .catch(console.error)
        .finally(() => setLoading1(false));
    } else {
      setStats1(null);
    }
  }, [player1]);

  useEffect(() => {
    if (player2) {
      setLoading2(true);
      api.getPlayerStats(player2.id)
        .then(setStats2)
        .catch(console.error)
        .finally(() => setLoading2(false));
    } else {
      setStats2(null);
    }
  }, [player2]);

  const renderStatCard = (title: string, value1?: string | number, value2?: string | number, icon?: any) => {
     const Icon = icon;
     const isComparison = !!stats2;

     return (
       <Card className="flex flex-col items-center justify-center p-4 text-center">
         <div className="bg-blue-50 p-3 rounded-full mb-2">
            {Icon && <Icon className="w-6 h-6 text-blue-600" />}
         </div>
         <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>

         <div className="flex items-center gap-6 mt-1">
             <div className="text-center">
                 <p className="text-2xl font-bold text-gray-800">{value1 ?? '-'}</p>
                 {isComparison && <p className="text-xs text-blue-500 font-medium">{player1?.name}</p>}
             </div>

             {isComparison && (
                 <>
                   <div className="w-px h-8 bg-gray-200"></div>
                   <div className="text-center">
                       <p className="text-2xl font-bold text-gray-800">{value2 ?? '-'}</p>
                       <p className="text-xs text-purple-500 font-medium">{player2?.name}</p>
                   </div>
                 </>
             )}
         </div>
       </Card>
     );
  };

  const chartData = [
    { name: 'Solo High', P1: stats1?.high_score_solo || 0, P2: stats2?.high_score_solo || 0 },
    { name: 'Duo High', P1: stats1?.high_score_duo || 0, P2: stats2?.high_score_duo || 0 },
    { name: 'Trio High', P1: stats1?.high_score_trio || 0, P2: stats2?.high_score_trio || 0 },
    { name: 'Group High', P1: stats1?.high_score_group || 0, P2: stats2?.high_score_group || 0 },
    { name: 'Avg Score', P1: stats1?.avg_score || 0, P2: stats2?.avg_score || 0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 pb-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4 py-6">
          <Button variant="secondary" onClick={() => setCurrentScreen('home')} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1 text-center">
             <h1 className="text-3xl font-bold text-gray-800 mb-2">Player Stats</h1>
             <p className="text-gray-600">Analyze performance and compare players</p>
          </div>
          <div className="w-20" />
        </div>

        {/* Search Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Card className="space-y-2 border-t-4 border-blue-500">
               <label className="text-sm font-bold text-gray-700">Primary Player</label>
               {player1 ? (
                   <div className="flex justify-between items-center bg-blue-50 p-2 rounded-lg">
                       <span className="font-semibold text-blue-900">{player1.name} <span className="text-xs text-blue-600">#{player1.number}</span></span>
                       <button onClick={() => setPlayer1(null)} className="text-red-500 hover:text-red-700 text-sm font-medium">Change</button>
                   </div>
               ) : (
                   <PlayerSearch onSelect={setPlayer1} placeholder="Search Player 1..." />
               )}
           </Card>

           <Card className="space-y-2 border-t-4 border-purple-500">
               <label className="text-sm font-bold text-gray-700">Compare With (Optional)</label>
               {player2 ? (
                   <div className="flex justify-between items-center bg-purple-50 p-2 rounded-lg">
                       <span className="font-semibold text-purple-900">{player2.name} <span className="text-xs text-purple-600">#{player2.number}</span></span>
                       <button onClick={() => setPlayer2(null)} className="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
                   </div>
               ) : (
                   <PlayerSearch onSelect={setPlayer2} placeholder="Search Player 2..." />
               )}
           </Card>
        </div>

        {stats1 && player1 && (
            <div className="space-y-6 animate-slideIn">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {renderStatCard("Total Games", stats1.total_games, stats2?.total_games, Calculator)}
                    {renderStatCard("Win Rate", `${stats1.win_rate}%`, stats2 ? `${stats2.win_rate}%` : undefined, Trophy)}
                    {renderStatCard("Avg Score", stats1.avg_score, stats2?.avg_score, BarChart3)}
                    {renderStatCard("Wins", stats1.wins, stats2?.wins, User)}
                </div>

                <Card className="p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-gray-500" />
                        Performance Metrics
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="P1" name={player1.name} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                {stats2 && player2 && <Bar dataKey="P2" name={player2.name} fill="#a855f7" radius={[4, 4, 0, 0]} />}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">Best Scores ({player1.name})</h4>
                         <div className="space-y-2">
                             <div className="flex justify-between"><span>Solo</span> <span className="font-bold">{stats1.high_score_solo}</span></div>
                             <div className="flex justify-between"><span>Duo</span> <span className="font-bold">{stats1.high_score_duo}</span></div>
                             <div className="flex justify-between"><span>Trio</span> <span className="font-bold">{stats1.high_score_trio}</span></div>
                             <div className="flex justify-between"><span>Group (4+)</span> <span className="font-bold">{stats1.high_score_group}</span></div>
                         </div>
                    </Card>

                    {stats2 && player2 && (
                         <Card>
                            <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">Best Scores ({player2.name})</h4>
                             <div className="space-y-2">
                                 <div className="flex justify-between"><span>Solo</span> <span className="font-bold">{stats2.high_score_solo}</span></div>
                                 <div className="flex justify-between"><span>Duo</span> <span className="font-bold">{stats2.high_score_duo}</span></div>
                                 <div className="flex justify-between"><span>Trio</span> <span className="font-bold">{stats2.high_score_trio}</span></div>
                                 <div className="flex justify-between"><span>Group (4+)</span> <span className="font-bold">{stats2.high_score_group}</span></div>
                             </div>
                        </Card>
                    )}
                </div>
            </div>
        )}

        {(!stats1 && !loading1) || loading2 && (
             // Keep linter happy about usage of loading2 if needed, though simpler is just to ignore
             <></>
        )}

        {!stats1 && !loading1 && (
            <div className="text-center py-12 text-gray-400">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a player to view statistics</p>
            </div>
        )}
      </div>
    </div>
  );
}
