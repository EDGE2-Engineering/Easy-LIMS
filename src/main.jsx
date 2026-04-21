
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import '@/index.css';
import { migrateStorageKeys } from '@/data/storageKeys';

// Migrate old localStorage keys to new standardized names
migrateStorageKeys();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
