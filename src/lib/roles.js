// Role-based access control
const ROLE_ACCESS = {
  admin: ['my_work', 'dashboard', 'kpis', 'buildings', 'pickups', 'payments', 'commissions', 'warehouse', 'users', 'vehicles', 'sales_members', 'dealing_room', 'drivers', 'new_requests', 'customers', 'reports'],
  ops: ['my_work', 'dashboard', 'kpis', 'buildings', 'pickups', 'payments', 'commissions', 'warehouse', 'vehicles', 'sales_members', 'dealing_room', 'drivers', 'new_requests', 'customers', 'reports'],
  sales_rep: ['my_work', 'buildings', 'commissions'],
  banger: ['my_work', 'dealing_room', 'commissions'],
  data_manager: ['my_work', 'buildings', 'pickups', 'new_requests', 'customers'],
  driver: ['my_work', 'todays_route'],
  warehouse_foreman: ['my_work', 'warehouse'],
  customer: ['my_work', 'my_building'],
};

const KNOWN_ROLES = Object.keys(ROLE_ACCESS);

export function isUnassignedRole(role) {
  return !role || role === 'user' || !KNOWN_ROLES.includes(role);
}

export function canAccess(role, module) {
  if (!role) return false;
  return ROLE_ACCESS[role]?.includes(module) || false;
}

export function getHomeRoute(role) {
  switch (role) {
    case 'admin':
    case 'ops':
      return '/';
    case 'sales_rep':
      return '/buildings';
    case 'banger':
      return '/dealing-room';
    case 'data_manager':
      return '/buildings';
    case 'driver':
      return '/todays-route';
    case 'warehouse_foreman':
      return '/warehouse';
    case 'customer':
      return '/my-building';
    default:
      return '/';
  }
}