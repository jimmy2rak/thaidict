import { ClerkProvider } from '@clerk/clerk-react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ClerkProvider is safe to use even without a key —
// the LoginPage has defensive fallbacks for demo mode
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ''

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {clerkKey ? (
      <ClerkProvider publishableKey={clerkKey}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
)
