import { useEffect, useState } from 'preact/hooks';
import { t } from './i18n';
import { applyUpdate, dismissPwaNotice, getPwaState, subscribePwa } from './pwa';
import { parseRoute, routeHref, type Route } from './router';
import { useStore } from './storage/store';
import { BoardScreen } from './ui/screens/BoardScreen';
import { ChainScreen } from './ui/screens/ChainScreen';
import { DataScreen } from './ui/screens/DataScreen';
import { DiagScreen } from './ui/screens/DiagScreen';
import { GamesPracticeScreen, GamesScreen } from './ui/screens/GamesScreen';
import { LearnScreen } from './ui/screens/LearnScreen';
import { LicensesScreen } from './ui/screens/LicensesScreen';
import { MoreScreen } from './ui/screens/MoreScreen';
import { PlayScreen, PlayTrapScreen } from './ui/screens/PlayScreen';
import { SessionScreen } from './ui/screens/SessionScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { TodayScreen } from './ui/screens/TodayScreen';
import { PuzzlesScreen } from './ui/screens/PuzzlesScreen';
import { PuzzleTestScreen } from './ui/screens/PuzzleTestScreen';
import { PuzzleThemeScreen } from './ui/screens/PuzzleThemeScreen';
import { ReviewScreen } from './ui/screens/ReviewScreen';
import { TrapListScreen } from './ui/screens/TrapListScreen';
import { TrapScreen } from './ui/screens/TrapScreen';

function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return route;
}

function PwaNotice() {
  const [state, setState] = useState(getPwaState);
  useEffect(() => subscribePwa(setState), []);

  if (!state.updateAvailable && !state.offlineReady) return null;
  return (
    <div class="notice" role="status">
      <span>{state.updateAvailable ? t.pwa.updateAvailable : t.pwa.offlineReady}</span>
      {state.updateAvailable ? (
        <button type="button" class="button button-primary" onClick={applyUpdate}>
          {t.pwa.update}
        </button>
      ) : (
        <button type="button" class="button" onClick={dismissPwaNotice}>
          {t.pwa.dismiss}
        </button>
      )}
    </div>
  );
}

/** Says so when progress cannot be saved, instead of losing it silently. */
function StorageNotice() {
  const { storage } = useStore();
  if (storage === 'saved') return null;
  return (
    <div class="notice notice-warning" role="alert">
      <span>{t.storage[storage]}</span>
      {storage === 'newer' && (
        <a class="button" href={routeHref({ name: 'data' })}>
          {t.storage.saveFile}
        </a>
      )}
    </div>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'today':
      return <TodayScreen />;
    case 'session':
      return <SessionScreen />;
    case 'more':
      return <MoreScreen />;
    case 'games':
      return <GamesScreen />;
    case 'gamesPractice':
      return <GamesPracticeScreen />;
    case 'play':
      return <PlayScreen />;
    case 'playTrap':
      return <PlayTrapScreen id={route.id} />;
    case 'settings':
      return <SettingsScreen />;
    case 'licenses':
      return <LicensesScreen />;
    case 'traps':
      return <TrapListScreen />;
    case 'trap':
      return <TrapScreen id={route.id} />;
    case 'learn':
      return <LearnScreen id={route.id} />;
    case 'chain':
      return <ChainScreen id={route.id} />;
    case 'review':
      return <ReviewScreen id={route.id} />;
    case 'puzzles':
      return <PuzzlesScreen />;
    case 'puzzleTest':
      return <PuzzleTestScreen />;
    case 'puzzleTheme':
      return <PuzzleThemeScreen theme={route.theme} />;
    case 'board':
      return <BoardScreen />;
    case 'data':
      return <DataScreen />;
    case 'diag':
      return <DiagScreen />;
    case 'notFound':
      return (
        <div class="screen">
          <h1 class="screen-title">{t.notFound.title}</h1>
          <a class="button button-primary" href={routeHref({ name: 'today' })}>
            {t.notFound.back}
          </a>
        </div>
      );
  }
}

export function App() {
  const route = useRoute();
  const inTraps = ['traps', 'trap', 'learn', 'chain', 'review', 'playTrap'].includes(route.name);
  const inPuzzles = ['puzzles', 'puzzleTest', 'puzzleTheme'].includes(route.name);
  const inToday = route.name === 'today' || route.name === 'session';
  const inMore = ['more', 'settings', 'data', 'diag', 'board', 'play', 'licenses', 'games', 'gamesPractice'].includes(route.name);
  // A new screen starts at the top; without this the page keeps the scroll of the previous one.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name, 'id' in route ? route.id : '', 'theme' in route ? route.theme : '']);
  return (
    <>
      <header class="header">
        <span class="header-title">{t.appTitle}</span>
        <nav class="nav">
          <a href={routeHref({ name: 'today' })} aria-current={inToday ? 'page' : undefined}>
            {t.nav.today}
          </a>
          <a href={routeHref({ name: 'traps' })} aria-current={inTraps ? 'page' : undefined}>
            {t.nav.traps}
          </a>
          <a href={routeHref({ name: 'puzzles' })} aria-current={inPuzzles ? 'page' : undefined}>
            {t.nav.puzzles}
          </a>
          <a href={routeHref({ name: 'more' })} aria-current={inMore ? 'page' : undefined}>
            {t.nav.more}
          </a>
        </nav>
      </header>
      <PwaNotice />
      <StorageNotice />
      <main class="main">
        <Screen route={route} />
      </main>
    </>
  );
}
