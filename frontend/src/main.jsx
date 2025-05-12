import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { APIProvider } from '@vis.gl/react-google-maps'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
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
  </React.StrictMode>,
)
