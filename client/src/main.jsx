import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './account.css'
import './tables.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { TableChoiceProvider } from './context/TableChoiceProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <CartProvider>
        <TableChoiceProvider>
          <App />
        </TableChoiceProvider>
      </CartProvider>
    </AuthProvider>
  </StrictMode>,
)
