import { useEffect, useState } from 'preact/hooks';
import { t } from './i18n';
import { applyUpdate, dismissPwaNotice, getPwaState, subscribePwa } from './pwa';
import { parseRoute, routeHref, type Route } from './router';
import { BoardScreen } from './ui/screens/BoardScreen';
import { DiagScreen } from './ui/screens/DiagScreen';
import { LearnScreen } from './ui/screens/LearnScreen';
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

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'traps':
      return <TrapListScreen />;
    case 'trap':
      return <TrapScreen id={route.id} />;
    case 'learn':
      return <LearnScreen id={route.id} />;
    case 'board':
      return <BoardScreen />;
    case 'diag':
      return <DiagScreen />;
    case 'notFound':
      return (
        <div class="screen">
          <h1 class="screen-title">{t.notFound.title}</h1>
          <a class="button button-primary" href={routeHref({ name: 'traps' })}>
            {t.notFound.back}
          </a>
        </div>
      );
  }
}

export function App() {
  const route = useRoute();
  const inTraps = route.name === 'traps' || route.name === 'trap' || route.name === 'learn';
  // A new screen starts at the top; without this the page keeps the scroll of the previous one.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name, 'id' in route ? route.id : '']);
  return (
    <>
      <header class="header">
        <span class="header-title">{t.appTitle}</span>
        <nav class="nav">
          <a href={routeHref({ name: 'traps' })} aria-current={inTraps ? 'page' : undefined}>
            {t.nav.traps}
          </a>
          <a href={routeHref({ name: 'board' })} aria-current={route.name === 'board' ? 'page' : undefined}>
            {t.nav.board}
          </a>
          <a href={routeHref({ name: 'diag' })} aria-current={route.name === 'diag' ? 'page' : undefined}>
            {t.nav.diag}
          </a>
        </nav>
      </header>
      <PwaNotice />
      <main class="main">
        <Screen route={route} />
      </main>
    </>
  );
}
