// Finds the SalesMember record linked to a user (by rep_code or name match)
export function findUserSalesMember(user, salesMembers) {
  if (!user) return null;
  return salesMembers.find(sm =>
    (sm.rep_code && user.rep_code && sm.rep_code === user.rep_code) ||
    (sm.name && user.full_name && sm.name === user.full_name)
  ) || null;
}

// Returns the effective rep_code: SalesMember's rep_code takes priority, falls back to user's
export function getEffectiveRepCode(user, salesMembers) {
  const sm = findUserSalesMember(user, salesMembers);
  return sm?.rep_code || user?.rep_code || '';
}