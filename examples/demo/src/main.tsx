import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './styles/globals.css';

function DemoApp() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-4 px-6 py-12">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
        auth-mini
      </p>
      <h1 className="text-4xl font-semibold text-slate-950">Examples Demo</h1>
      <p className="text-base text-slate-600">
        Standalone Vite + React scaffold for the upcoming interactive demo.
      </p>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <DemoApp />
    </HashRouter>
  </React.StrictMode>,
);
