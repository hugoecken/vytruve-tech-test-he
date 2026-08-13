import { CircleCheckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BrandLockup } from '@/shared/brand/brand-lockup';

/** Props for the shared account-access composition. */
interface AuthenticationLayoutProps {
  children: React.ReactNode;
}

/**
 * Composes the canonical responsive brand and account-access panels.
 *
 * @param props Form content supplied by the active authentication route.
 * @returns The desktop split view and compact stacked view.
 */
export function AuthenticationLayout({
  children,
}: AuthenticationLayoutProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <main className="grid min-h-svh place-items-center bg-secondary px-4 py-6 sm:px-6 lg:px-10">
      <div className="grid w-full max-w-[1200px] overflow-hidden rounded-[calc(var(--radius)+0.5rem)] border bg-background shadow-sm lg:min-h-[760px] lg:grid-cols-[480px_1fr]">
        <section className="flex min-h-35 items-center justify-center bg-primary px-8 py-8 text-primary-foreground sm:px-12 lg:min-h-full lg:flex-col lg:items-start lg:justify-start lg:p-16">
          <BrandLockup className="w-42 lg:w-63" tone="on-brand" />

          <div className="hidden lg:mt-8 lg:flex lg:flex-col lg:gap-8">
            <div className="flex flex-col gap-6">
              <h1 className="max-w-sm text-2xl leading-8 font-semibold">
                {t('auth.brand.title')}
              </h1>
              <p className="max-w-sm text-sm leading-6">
                {t('auth.brand.description')}
              </p>
            </div>

            <ul className="mt-auto flex min-h-72 flex-col justify-end gap-4 text-sm leading-6">
              {(['records', 'scans', 'printing'] as const).map((benefit) => (
                <li className="flex items-center gap-3" key={benefit}>
                  <CircleCheckIcon
                    aria-hidden="true"
                    className="size-4 shrink-0"
                  />
                  <span>{t(`auth.brand.benefits.${benefit}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="flex items-start bg-background px-8 py-10 sm:px-12 lg:items-center lg:px-24 lg:py-16">
          <div className="mx-auto w-full max-w-[528px]">{children}</div>
        </section>
      </div>
    </main>
  );
}
