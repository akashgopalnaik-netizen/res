import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../context/store'

export default function ProtectedRoute({ children }) {
  const user = useAuthStore((state) => state.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
