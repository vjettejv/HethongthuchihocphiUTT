import { Navigate, Outlet } from 'react-router-dom'

function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem('token')
  const userRaw = localStorage.getItem('user')

  if (!token || !userRaw) {
    return <Navigate to="/login" replace />
  }

  let user
  try {
    user = JSON.parse(userRaw)
  } catch {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return <Navigate to="/login" replace />
  }

  const role = user?.role
  if (!role) {
    return <Navigate to="/login" replace />
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
