import { type ReactNode } from 'react';

/** Props shared by full-page system fallbacks. */
interface SystemFallbackPageProps {
  action: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

/**
 * Renders the canonical full-page structure for an unrecoverable route state.
 *
 * @param props Localized copy and the state-specific recovery action.
 * @returns A focused, accessible system fallback.
 */
export function SystemFallbackPage({
  action,
  description,
  eyebrow,
  title,
}: SystemFallbackPageProps) {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-6 py-24">
      <section className="flex w-full max-w-xl flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-6">
          <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
          <h1 className="max-w-lg text-4xl leading-tight font-semibold tracking-tight sm:text-6xl sm:leading-none">
            {title}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </section>
    </main>
  );
}
