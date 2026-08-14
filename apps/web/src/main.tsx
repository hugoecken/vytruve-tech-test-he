import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/app';
import { initializeI18n } from './shared/i18n/i18n';
import './styles.css';

/** Initializes localization before mounting the browser application. */
async function bootstrap(): Promise<void> {
  await initializeI18n();

  const root = createRoot(document.getElementById('root') as HTMLElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
