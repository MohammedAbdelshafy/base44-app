import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { name, phone, address, gps_lat, gps_lng, photo, num_floors, num_apartments, link_user_id, property_type } = body;
    const ptype = property_type || 'apartment_building';
    const isApartment = ptype === 'apartment_building';

    if (!name || !phone || !address) {
      return Response.json({ error: 'Missing required fields (name, phone, address)' }, { status: 400 });
    }
    if (gps_lat == null || gps_lng == null) {
      return Response.json({ error: 'GPS location is required' }, { status: 400 });
    }

    const building = await base44.asServiceRole.entities.Building.create({
      name: address,
      address,
      property_type: ptype,
      bawab_name: isApartment ? name : '',
      bawab_phone: isApartment ? phone : '',
      contact_person_name: isApartment ? '' : name,
      contact_person_phone: isApartment ? '' : phone,
      gps_lat: Number(gps_lat),
      gps_lng: Number(gps_lng),
      photo: photo || '',
      num_floors: isApartment && num_floors ? Number(num_floors) : null,
      num_apartments: isApartment && num_apartments ? Number(num_apartments) : null,
      status: 'pickup_requested',
      source: 'bawab_signup',
    });

    if (link_user_id) {
      try {
        await base44.asServiceRole.entities.User.update(link_user_id, { building_id: building.id });
      } catch (e) {
        // building created; linking failed — admin can link manually
      }
    }

    return Response.json({ success: true, building_id: building.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});