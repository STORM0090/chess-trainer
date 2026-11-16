import { useEffect, useState } from 'preact/hooks';
import { t } from '../../i18n';
import { routeHref } from '../../router';

/**
 * The full license texts of everything the app ships. The file is generated at build time
 * by scripts/licenses.ts from the packages themselves and cached for offline use.
 */
export function LicensesScreen() {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}licenses.txt`).then(
      async (response) => (response.ok ? setText(await response.text()) : setFailed(true)),
      () => setFailed(true),
    );
  }, []);
  return (
    <div class="screen list-screen">
      <h1 class="screen-title">{t.licenses.title}</h1>
      <p class="hint">{t.licenses.intro}</p>
      {text === null ? (
        <p class={failed ? 'verdict verdict-bad' : 'hint-text'} role="status">
          {failed ? t.licenses.failed : t.licenses.loading}
        </p>
      ) : (
        <pre class="licenses">{text}</pre>
      )}
      <a class="button button-quiet" href={routeHref({ name: 'more' })}>
        {t.more.back}
      </a>
    </div>
  );
}
