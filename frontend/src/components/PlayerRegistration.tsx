import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { api, Player } from '../utils/api';

interface PlayerRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (player: Player) => void;
  initialName?: string;
}

export function PlayerRegistration({ isOpen, onClose, onSuccess, initialName = '' }: PlayerRegistrationProps) {
  const [name, setName] = useState(initialName);
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !number.trim()) {
      setError('Name and Number are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const player = await api.registerPlayer(name.trim(), number.trim());
      onSuccess(player);
      onClose();
      setName('');
      setNumber('');
    } catch (err) {
      setError('Failed to register player. It might already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Register New Player</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Player Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice"
          />

          <Input
            label="Unique Number"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="e.g. 001"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Registering...' : 'Register'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
