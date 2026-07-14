import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { reportClientError } from './api';
import './index.css';

window.addEventListener('error', (event) => {
  reportClientError(event.message, event.error?.stack, 'window.onerror');
});
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  reportClientError(reason?.message || String(reason), reason?.stack, 'unhandledrejection');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
