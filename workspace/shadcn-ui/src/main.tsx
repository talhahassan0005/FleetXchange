import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Refresh the portal after login/logout to ensure all pages reflect the new session
window.addEventListener('auth:login', () => {
  const path = window.location.pathname;
  // Avoid reloading while on the login screen; router will navigate after state updates
  if (path === '/' || path.startsWith('/login')) {
    console.log('✅ auth:login received on login page — skipping hard reload');
    return;
  }
  console.log('🔁 auth:login received — reloading app to initialize portal state');
  window.location.reload();
});

window.addEventListener('auth:logout', () => {
  console.log('🔁 auth:logout received — reloading app to clear session');
  window.location.reload();
});

