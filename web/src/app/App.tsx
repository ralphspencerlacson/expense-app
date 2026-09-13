import { RouterProvider } from 'react-router'
import { AuthGate } from '../components/auth-gate'
import { router } from './router'

export default function App() {
  return <AuthGate><RouterProvider router={router} /></AuthGate>
}
