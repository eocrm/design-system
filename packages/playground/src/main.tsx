import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@eocrm/design-system/styles/global.scss';
import './playground.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
