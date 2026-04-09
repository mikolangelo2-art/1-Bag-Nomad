import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme/luxury-tokens.css'
import './theme/luxury-app.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
