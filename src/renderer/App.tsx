import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import MainView from './components/MainView';
import PlayerView from './components/PlayerView';
import './App.css';

declare global {
  interface Window {
    electronAPI: import('../preload/preload').ElectronAPI;
  }
}

function App() {
  console.log('App rendering, electronAPI available:', !!window.electronAPI);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainView />} />
        <Route path="/player" element={<PlayerView />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
