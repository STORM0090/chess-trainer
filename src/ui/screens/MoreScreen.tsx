import { t } from '../../i18n';
import { routeHref, type Route } from '../../router';

type Target = Exclude<Route, { name: 'notFound' }>;

const LINKS: { route: Target; key: 'play' | 'games' | 'board' | 'settings' | 'data' | 'diag' | 'licenses' }[] = [
  { route: { name: 'play' }, key: 'play' },
  { route: { name: 'games' }, key: 'games' },
  { route: { name: 'settings' }, key: 'settings' },
  { route: { name: 'data' }, key: 'data' },
  { route: { name: 'board' }, key: 'board' },
  { route: { name: 'diag' }, key: 'diag' },
  { route: { name: 'licenses' }, key: 'licenses' },
];

/** Everything that is not daily practice: settings, the progress file, the free board. */
export function MoreScreen() {
  return (
    <div class="screen list-screen">
      <h1 class="screen-title">{t.more.title}</h1>
      <ul class="trap-list">
        {LINKS.map(({ route, key }) => (
          <li key={key}>
            <a class="trap-card" href={routeHref(route)}>
              <span class="trap-card-text">
                <span class="trap-card-title">{t.more.links[key].title}</span>
                <span class="trap-card-meta">{t.more.links[key].help}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
