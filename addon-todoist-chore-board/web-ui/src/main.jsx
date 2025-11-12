import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

const sensorsEnv = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_TODOIST_SENSORS : undefined;

if (!window.ADDON_CONFIG) {
  const sensors = typeof sensorsEnv === 'string' && sensorsEnv.length > 0
    ? sensorsEnv.split(',').map(sensor => sensor.trim()).filter(Boolean)
    : [];
  window.ADDON_CONFIG = { sensors };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
