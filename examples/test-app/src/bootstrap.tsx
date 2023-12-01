import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import Entry from './entry';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <StrictMode>
    <Entry />
  </StrictMode>,
);
