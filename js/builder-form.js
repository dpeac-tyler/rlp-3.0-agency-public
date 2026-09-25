/**
 * Sample form shared by the Build steps.
 *
 * Question Builder and Conditions both start from this one list, so the rules
 * on the Conditions step point at the same questions the builder shows.
 * Neither page persists its edits; each reload starts from here again.
 *
 * A block's cond is the one condition it may carry: { on: trigger id, val:
 * the answer that shows it }. Only Yes/No; Either/Or questions are triggers,
 * and a follow-up always sits somewhere below its trigger.
 */
var BUILDER_FORM = [
  { id: 's1', kind: 'section', title: 'Vessel information', text: 'Tell us about the vessel you will use for commercial fishing.' },
  { id: 'q1', kind: 'q', type: 'Free Form', text: 'Vessel name', req: true, fmt: 'alphanumeric', len: 'small' },
  { id: 'q2', kind: 'q', type: 'Free Form', text: 'State registration number', req: true, fmt: 'alphanumeric', len: 'small' },
  { id: 'q14', kind: 'q', type: 'Yes/No; Either/Or', text: 'Is the vessel owned or leased?', req: true, opts: ['Owned', 'Leased'] },
  { id: 'q15', kind: 'q', type: 'Free Form', text: 'Name of the vessel owner (lessor)', req: true, fmt: 'alphanumeric', len: 'small',
    cond: { on: 'q14', val: 'Leased' } },
  { id: 'q16', kind: 'q', type: 'Acknowledgment', text: 'I confirm my lease allows the vessel to be used for commercial fishing for the full 2026 season.', req: true,
    cond: { on: 'q14', val: 'Leased' } },
  { id: 'q3', kind: 'q', type: 'Free Form', text: 'Vessel length (feet)', req: true, fmt: 'numeric', numFmt: 'integer', minVal: 8, maxVal: 120 },
  { id: 'q4', kind: 'q', type: 'Multiple Choice', text: 'Home port', req: true, opts: ['Alton', 'Grafton', 'Havana', 'Peoria', 'Quincy'] },
  { id: 'q5', kind: 'q', type: 'Addresses / Repeatable Fields', text: 'Where is the vessel moored when not in use?', req: true, min: 1,
    fields: { 'Address Line 1': 'r', 'Address Line 2': 'd', 'City/APO/DPO/FPO': 'r', 'State': 'r', 'Zip Code': 'r' },
    instrOn: true, instr: 'Add each marina or private dock you use during the season.' },
  { id: 's2', kind: 'section', title: 'Fishing activity', text: '' },
  { id: 'q6', kind: 'q', type: 'Multi-Select', text: 'Which species do you intend to harvest?', req: true, opts: ['Catfish', 'Carp', 'Buffalo', 'Freshwater drum', 'Paddlefish'] },
  { id: 'q7', kind: 'q', type: 'Multiple Choice', text: 'Primary gear type', req: true, opts: ['Gill net', 'Trap net', 'Hoop net', 'Seine', 'Hook and line'] },
  { id: 'q8', kind: 'q', type: 'Date / Date Range', text: 'When do you plan to fish this season?', req: true, range: true },
  { id: 'q9', kind: 'q', type: 'Yes/No; Either/Or', text: 'Have you held a commercial fishing permit in the last 3 years?', req: true, opts: ['Yes', 'No'] },
  { id: 'q10', kind: 'q', type: 'Free Form', text: 'Previous permit number', req: false, fmt: 'alphanumeric', len: 'small', cond: { on: 'q9', val: 'Yes' } },
  { id: 'q11', kind: 'q', type: 'Table (Row Labels)', text: 'Pounds harvested last season, by species', req: false,
    rowHead: 'Species', agencyRows: true, rows: ['Catfish', 'Carp', 'Buffalo'], cols: [{ name: 'Pounds', fmt: 'numeric' }],
    reqRows: 0, colAgg: 'sum', rowAgg: 'none', grand: false },
  { id: 'q17', kind: 'q', type: 'Yes/No; Either/Or', text: 'Will anyone other than you work aboard the vessel?', req: true, opts: ['Yes', 'No'] },
  { id: 'q12', kind: 'q', type: 'Table', text: 'Crew members', req: false, reqRows: 0,
    cols: [{ name: 'Name', fmt: 'alphanumeric' }, { name: 'Role', fmt: 'alphanumeric' }, { name: 'License No.', fmt: 'alphanumeric' }] },
  { id: 'd1', kind: 'desc', text: 'Each crew member needs their own commercial fishing deckhand license before the season opens.' },
  { id: 's3', kind: 'section', title: 'Declarations', text: '' },
  { id: 'q13', kind: 'q', type: 'Acknowledgment', text: 'I certify that the information provided is true and complete.', req: true }
];

