import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { GameState, EndGameResponse } from '../utils/api';

interface GameContextType {
  gameId: string | null;
  gameState: GameState | null;
  endGameData: EndGameResponse | null;
  setGameId: (id: string | null) => void;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
  setEndGameData: (data: EndGameResponse | null) => void;
  currentScreen: 'home' | 'setup' | 'active' | 'gameover' | 'stats';
  setCurrentScreen: (screen: 'home' | 'setup' | 'active' | 'gameover' | 'stats') => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameId, setGameIdState] = useState<string | null>(() => {
    return localStorage.getItem('current_game_id');
  });
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [endGameData, setEndGameData] = useState<EndGameResponse | null>(null);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'setup' | 'active' | 'gameover' | 'stats'>('home');

  const setGameId = (id: string | null) => {
    setGameIdState(id);
    if (id) {
      localStorage.setItem('current_game_id', id);
    } else {
      localStorage.removeItem('current_game_id');
    }
  };

  return (
    <GameContext.Provider
      value={{
        gameId,
        gameState,
        endGameData,
        setGameId,
        setGameState,
        setEndGameData,
        currentScreen,
        setCurrentScreen,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
