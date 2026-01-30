import { useState, useEffect, useRef } from 'react';
import { Search, Plus } from 'lucide-react';
import { api, Player } from '../utils/api';

interface PlayerSearchProps {
  onSelect: (player: Player) => void;
  onCreateNew?: (name: string) => void;
  placeholder?: string;
  className?: string;
}

export function PlayerSearch({ onSelect, onCreateNew, placeholder = "Search player...", className = "" }: PlayerSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const search = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const players = await api.getPlayers(query);
        setResults(players);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && (query || results.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          {loading && <div className="p-2 text-gray-500 text-sm">Searching...</div>}

          {!loading && results.length > 0 && (
            <div className="py-1">
              {results.map((player) => (
                <button
                  key={player.id}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center"
                  onClick={() => {
                    onSelect(player);
                    setQuery('');
                    setIsOpen(false);
                  }}
                >
                  <span className="font-medium text-gray-700">{player.name}</span>
                  <span className="text-sm text-gray-400">#{player.number}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && query && (
            <div className="border-t">
              <button
                className="w-full px-4 py-2 text-left text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                onClick={() => {
                  if (onCreateNew) onCreateNew(query);
                  setIsOpen(false);
                }}
              >
                <Plus className="w-4 h-4" />
                Create "{query}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
