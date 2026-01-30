import { Trophy, Crown, Medal, Award } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { useGame } from '../context/GameContext';

export function GameOver() {
  const { endGameData, setGameId, setGameState, setEndGameData, setCurrentScreen } = useGame();

  const handleNewGame = () => {
    setGameId(null);
    setGameState(null);
    setEndGameData(null);
    setCurrentScreen('setup');
  };

  if (!endGameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <p className="text-gray-600">No game data available</p>
      </div>
    );
  }

  const sortedScores = [...endGameData.final_scores].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 p-4 pb-8">
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        <div className="text-center py-8">
          <div className="flex justify-center mb-4 animate-bounce">
            <Crown className="w-20 h-20 text-yellow-500" />
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Game Over!</h1>
          <p className="text-xl text-gray-600">Congratulations to all players!</p>
        </div>

        <Card className="bg-gradient-to-br from-yellow-100 to-yellow-200 border-4 border-yellow-400 animate-scaleIn">
          <div className="text-center space-y-3">
            <Trophy className="w-16 h-16 text-yellow-600 mx-auto" />
            <h2 className="text-3xl font-bold text-gray-800">Winner</h2>
            <p className="text-5xl font-bold text-yellow-600">{endGameData.winner}</p>
            <p className="text-2xl font-semibold text-gray-700">
              {sortedScores[0].score} points
            </p>
          </div>
        </Card>

        <div className="space-y-3">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Award className="w-6 h-6" />
            Final Scores
          </h3>

          {sortedScores.map((entry, index) => {
            const Icon =
              index === 0 ? Crown : index === 1 ? Trophy : index === 2 ? Medal : Award;
            const bgColor =
              index === 0
                ? 'from-yellow-100 to-yellow-200'
                : index === 1
                ? 'from-gray-100 to-gray-200'
                : index === 2
                ? 'from-orange-100 to-orange-200'
                : 'from-blue-50 to-blue-100';
            const textColor =
              index === 0
                ? 'text-yellow-600'
                : index === 1
                ? 'text-gray-600'
                : index === 2
                ? 'text-orange-600'
                : 'text-blue-600';

            return (
              <Card
                key={entry.team}
                className={`bg-gradient-to-r ${bgColor} animate-slideIn`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Icon className={`w-10 h-10 ${textColor}`} />
                    <div>
                      <p className="text-2xl font-bold text-gray-800">
                        {entry.team}
                      </p>
                      <p className="text-sm text-gray-600">
                        {index === 0 ? '1st Place' : index === 1 ? '2nd Place' : index === 2 ? '3rd Place' : `${index + 1}th Place`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-4xl font-bold ${textColor}`}>
                      {entry.score}
                    </p>
                    <p className="text-sm text-gray-600">points</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Button size="lg" className="w-full" onClick={handleNewGame}>
          Start New Game
        </Button>
      </div>
    </div>
  );
}
