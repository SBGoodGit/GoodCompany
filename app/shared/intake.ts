// Technical intake question library (§3.4). The content per category is an open product
// decision (OD10); this is a minimal placeholder set: generic questions for every category
// plus a few per category. Contractors can add their own questions (the "free custom field").

export interface IntakeQuestion {
  key: string
  text: string
  required: boolean
}

const GENERIC: IntakeQuestion[] = [
  { key: 'scope', text: 'Describe the work you need done in your own words.', required: true },
  { key: 'location_access', text: 'Where is the work done, and how is the site accessed?', required: true },
  { key: 'timing', text: 'When should the work start, and is there a deadline?', required: false },
]

const BY_CATEGORY: Record<string, IntakeQuestion[]> = {
  carpentry: [{ key: 'carpentry_materials', text: 'Do you have a preference for wood type or finish?', required: false }],
  plumbing: [{ key: 'plumbing_water', text: 'Can the water supply be shut off during the work?', required: true }],
  electrical: [{ key: 'electrical_panel', text: 'How old is the electrical installation / fuse box?', required: true }],
  painting: [{ key: 'painting_surface', text: 'Which surfaces (m², indoor/outdoor) need painting?', required: true }],
  roofing: [{ key: 'roofing_type', text: 'What type of roof is it (flat, pitched, material)?', required: true }],
  renovation: [{ key: 'renovation_permits', text: 'Are permits needed or already arranged?', required: false }],
  gardening: [{ key: 'gardening_size', text: 'How large is the garden area involved?', required: false }],
  it_services: [{ key: 'it_systems', text: 'Which systems or software are involved?', required: true }],
  design: [{ key: 'design_deliverables', text: 'Which deliverables and formats do you need?', required: true }],
}

export function intakeQuestionsFor(category: string): IntakeQuestion[] {
  return [...GENERIC, ...(BY_CATEGORY[category] ?? [])]
}
