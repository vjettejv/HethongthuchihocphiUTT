import { Navigate, Outlet } from 'react-router-dom'

function parseRole() {
  const userRaw = localStorage.getItem('user')
  if (!userRaw) return null
  try {
    return JSON.parse(userRaw)?.role ?? null
  } catch {
    return null
  }
}

/** Chỉ cho phép role `admin`; staff và các role khác chuyển tới /unauthorized */
function AdminOnlyRoute() {
  const role = parseRole()
  if (role !== 'admin') {
    return <Navigate to="/unauthorized" replace />
  }
  return <Outlet />
}

export default AdminOnlyRoute
