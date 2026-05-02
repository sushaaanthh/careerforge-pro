import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LandingPage from './components/LandingPage';

const root = ReactDOM.createRoot(document.getElementById('root'));
const pathname = window.location.pathname;
const isAppRoute = pathname.startsWith('/app') || pathname.startsWith('/dashboard');

root.render(
  <React.StrictMode>
    {isAppRoute ? <App /> : <LandingPage />}
  </React.StrictMode>
);