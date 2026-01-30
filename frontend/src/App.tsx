import { GameProvider, useGame } from './context/GameContext';
import { GameSetup } from './screens/GameSetup';
import { ActiveGame } from './screens/ActiveGame';
import { GameOver } from './screens/GameOver';

function AppContent() {
  const { currentScreen } = useGame();

  return (
    <>
      {currentScreen === 'setup' && <GameSetup />}
      {currentScreen === 'active' && <ActiveGame />}
      {currentScreen === 'gameover' && <GameOver />}
    </>
  );
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
