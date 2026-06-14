import { ClerkProvider } from '@clerk/clerk-react'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Always wrap with ClerkProvider so useAuth/useUser hooks work unconditionally.
// Without a publishable key Clerk operates in a "no-op" mode (isSignedIn=false).
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ''

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={clerkKey}>
      <App />
    </ClerkProvider>
  </React.StrictMode>
)
