import { useTranslation } from 'react-i18next';
import { SystemFallbackPage } from '@/shared/layout/system-fallback-page';
import { Button } from '@/shared/ui/button';

/** Props for an unrecoverable route-rendering failure. */
interface UnexpectedErrorPageProps {
  onRetry: () => void;
}

/**
 * Renders a safe recovery page without exposing technical error details.
 *
 * @param props Recovery action supplied by TanStack Router.
 * @returns The localized generic error fallback.
 */
export function UnexpectedErrorPage({
  onRetry,
}: UnexpectedErrorPageProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <SystemFallbackPage
      action={<Button onClick={onRetry}>{t('common.actions.retry')}</Button>}
      description={t('shell.unexpectedError.description')}
      eyebrow={t('shell.unexpectedError.eyebrow')}
      title={t('shell.unexpectedError.title')}
    />
  );
}
