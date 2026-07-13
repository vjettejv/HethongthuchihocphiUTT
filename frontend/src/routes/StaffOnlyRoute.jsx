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

/** Chỉ cán bộ tài vụ (staff): nghiệp vụ thu phí. Admin dùng khu vực /admin/... */
function StaffOnlyRoute() {
  const role = parseRole()
  if (role !== 'staff') {
    return <Navigate to="/unauthorized" replace />
  }
  return <Outlet />
}

export default StaffOnlyRoute
