import React from 'react';
import { SimpleAppProvider } from './contexts/SimpleAppContext';
import SimpleDashboard from './components/SimpleDashboard';
import './App.css';

function App() {
  return (
    <SimpleAppProvider>
      <div className="app">
        <header className="app-header">
          <h1>IPA PM試験採点システム</h1>
        </header>
        <main className="app-main">
          <SimpleDashboard />
        </main>
      </div>
    </SimpleAppProvider>
  );
}

export default App;
