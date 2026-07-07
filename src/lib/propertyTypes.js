export const PROPERTY_TYPES = [
  { value: 'apartment_building', labelKey: 'pt_apartment_building' },
  { value: 'villa', labelKey: 'pt_villa' },
  { value: 'single_apartment', labelKey: 'pt_single_apartment' },
  { value: 'restaurant_cafe', labelKey: 'pt_restaurant_cafe' },
  { value: 'shop', labelKey: 'pt_shop' },
  { value: 'office', labelKey: 'pt_office' },
  { value: 'school', labelKey: 'pt_school' },
  { value: 'other', labelKey: 'pt_other' },
];

export const TYPE_COLORS = {
  apartment_building: '#1e3a5f',
  villa: '#7c3aed',
  single_apartment: '#0891b2',
  restaurant_cafe: '#ea580c',
  shop: '#16a34a',
  office: '#2563eb',
  school: '#dc2626',
  other: '#6b7280',
};

export function isApartmentType(type) {
  return !type || type === 'apartment_building';
}

export function getTypeColor(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.other;
}

export function typeLabelKey(type) {
  const found = PROPERTY_TYPES.find(p => p.value === type);
  return found ? found.labelKey : 'pt_apartment_building';
}