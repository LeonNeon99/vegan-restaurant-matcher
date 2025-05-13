import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { APIProvider } from '@vis.gl/react-google-maps'
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionProvider>
        {GOOGLE_MAPS_API_KEY ? (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <App />
          </APIProvider>
        ) : (
          <div>
            <p>Error: Google Maps API Key is missing.</p>
            <p>Please set VITE_GOOGLE_MAPS_API_KEY in your .env file.</p>
          </div>
        )}
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
