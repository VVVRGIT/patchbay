import { MiniPlayer } from './components/MiniPlayer';
import { useRoute } from './lib/router';
import { PlayerProvider } from './player/PlayerContext';
import { EpisodeList } from './screens/EpisodeList';
import { Home } from './screens/Home';
import { Parents } from './screens/Parents';
import { Playlist } from './screens/Playlist';
import { PlayerScreen } from './screens/PlayerScreen';

function Screens() {
  const route = useRoute();
  return (
    <>
      {route.name === 'home' && <Home />}
      {route.name === 'feed' && <EpisodeList key={route.feedId} feedId={route.feedId} />}
      {route.name === 'player' && <PlayerScreen />}
      {route.name === 'playlist' && <Playlist />}
      {route.name === 'parents' && <Parents />}
      {route.name !== 'player' && route.name !== 'parents' && <MiniPlayer />}
    </>
  );
}

export default function App() {
  return (
    <PlayerProvider>
      <Screens />
    </PlayerProvider>
  );
}
