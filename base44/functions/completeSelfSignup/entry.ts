import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const KNOWN_ROLES = [
  'admin', 'ops', 'sales_rep', 'banger',
  'data_manager', 'driver', 'warehouse_foreman', 'customer',
];

// Safe, idempotent login-time guard.
// - Users who already have a real role (staff or customer) are left alone.
// - Admin-invited accounts that are still unassigned stay pending (an admin assigns the staff role).
// - Any other unassigned account is a self-signup → assigned 'customer'.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const buildingId = body.building_id || null;

    // Already has a real role: only link the building if one was provided.
    if (user.role && KNOWN_ROLES.includes(user.role)) {
      if (buildingId) {
        await base44.asServiceRole.entities.User.update(user.id, { building_id: buildingId });
      }
      return Response.json({ success: true, role: user.role, changed: false });
    }

    // Unassigned (platform default 'user'). Admin-invited accounts stay pending.
    if (user.invited_by_admin) {
      return Response.json({ success: true, role: user.role || 'user', changed: false, pending: true });
    }

    // Staff invitation: the platform's inviteUser only accepts 'user'/'admin',
    // so the intended staff role is stored on a pending Invitation record and
    // applied here at first login. (Self-signups have no Invitation and still
    // fall through to the 'customer' rule below — unchanged.)
    try {
      const matches = await base44.asServiceRole.entities.Invitation.filter(
        { email: user.email, status: 'pending' }
      );
      if (matches && matches.length > 0) {
        const inv = matches[0];
        const invUpdate = { role: inv.intended_role, invited_by_admin: true };
        if (buildingId) invUpdate.building_id = buildingId;
        await base44.asServiceRole.entities.User.update(user.id, invUpdate);
        await base44.asServiceRole.entities.Invitation.update(inv.id, {
          status: 'accepted',
          accepted_user_id: user.id,
        });
        return Response.json({ success: true, role: inv.intended_role, changed: true });
      }
    } catch (_e) {
      // If the Invitation lookup fails, fall through to the self-signup rule.
    }

    // Self-signup without a role → assign 'customer' (and link building if provided).
    const update = { role: 'customer' };
    if (buildingId) update.building_id = buildingId;
    await base44.asServiceRole.entities.User.update(user.id, update);
    return Response.json({ success: true, role: 'customer', changed: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});