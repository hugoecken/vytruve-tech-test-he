import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { SystemFallbackPage } from '@/shared/layout/system-fallback-page';
import { Button } from '@/shared/ui/button';

/** Props for the route fallback. */
interface NotFoundPageProps {
  authenticated: boolean;
}

/**
 * Renders the appropriate public or authenticated unknown-route fallback.
 *
 * @param props Whether the current browser session is authenticated.
 * @returns A localized page with one safe recovery action.
 */
export function NotFoundPage({
  authenticated,
}: NotFoundPageProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <SystemFallbackPage
      action={
        <Button
          nativeButton={false}
          render={
            authenticated ? (
              <Link to="/patients" />
            ) : (
              <Link search={{ redirect: '/patients' }} to="/sign-in" />
            )
          }
        >
          {authenticated
            ? t('shell.notFound.backToPatients')
            : t('shell.notFound.backToSignIn')}
        </Button>
      }
      description={t('shell.notFound.description')}
      eyebrow={t('shell.notFound.eyebrow')}
      title={t('shell.notFound.title')}
    />
  );
}
