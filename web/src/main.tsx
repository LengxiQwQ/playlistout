import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Canonical origin enforcement: redirect legacy/secondary origins to canonical domain
// Preserves user path and safe query params, strictly excludes any credential tokens
if (typeof window !== 'undefined' && window.location) {
  const host = window.location.hostname.toLowerCase();
  if (host === 'playlistout.com' || host === 'www.playlistout.com') {
    const canonicalUrl = new URL(window.location.href);
    canonicalUrl.hostname = 'playlistout.lengxiqwq.com';
    canonicalUrl.protocol = 'https:';
    canonicalUrl.searchParams.delete('token');
    canonicalUrl.searchParams.delete('auth');
    canonicalUrl.searchParams.delete('credential');
    canonicalUrl.searchParams.delete('kugou_token');
    window.location.replace(canonicalUrl.toString());
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
