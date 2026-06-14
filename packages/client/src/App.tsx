import { useStore } from './store.js';
import { Lobby } from './ui/Lobby.js';
import { RoomView } from './ui/RoomView.js';

export function App() {
  const { roomId, state } = useStore();
  // In a room (we've joined) and have received state → show the room/game.
  if (roomId && state) return <RoomView />;
  return <Lobby />;
}
