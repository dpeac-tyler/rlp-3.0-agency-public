/**
 * Shared case store for the Case Management pages.
 *
 * view-cases.html, view-case-detail.html, create-case.html and
 * create-investigation.html all read and write through here, so a case claimed
 * on the list is already claimed when you open its detail page, and a case
 * created in the form shows up in the list.
 *
 * Seed cases live in CASE_SEED. Anything the user changes during a session is
 * layered on top in sessionStorage, so a refresh keeps the prototype's state
 * but a new tab starts clean.
 */

var CASE_SEED = [
  {
    caseNumber: 'CM-2026-0347', dateReceived: '04/28/2026', caseSubject: 'Johnson, Marcus',
    status: 'Open', assignedTo: 'Unassigned', caseType: 'Appeal', priority: 'High',
    complainantName: 'Smith, Robert', licenseNumber: 'PI-2024-00892',
    physicalAddress: '1200 W 3rd St, Little Rock, AR 72201', emailAddress: 'm.johnson@email.com',
    filingMethod: 'Online', incidentDate: '04/15/2026', legacyCaseNumber: '',
    description: 'I hired Iron Shield Security LLC to provide security for a private fundraising gala on February 10, 2026. During the event, one of the guards became verbally aggressive toward a guest and physically shoved another attendee. When I asked for credentials, the guard refused and the company could not produce a valid Arkansas private security company license. I believe the company is operating without proper licensure.'
  },
  {
    caseNumber: 'CM-2026-0348', dateReceived: '04/29/2026', caseSubject: 'Lone Star Security, Inc.',
    status: 'Open', assignedTo: 'Unassigned', caseType: 'Complaint', priority: 'Medium',
    complainantName: 'Davis, Patricia', licenseNumber: 'SB-2023-01145',
    physicalAddress: '4201 Rogers Ave, Fort Smith, AR 72903', emailAddress: 'lonestar@security.com',
    filingMethod: 'Telephone', incidentDate: '04/20/2026', legacyCaseNumber: '',
    description: 'Guards assigned to our retail location were observed leaving the property unattended for extended periods during their scheduled shifts. Two incidents of shoplifting occurred during those gaps.'
  },
  {
    caseNumber: 'CM-2026-0349', dateReceived: '05/01/2026', caseSubject: 'Carter, Dennis',
    status: 'Open', assignedTo: 'Unassigned', caseType: 'Complaint', priority: 'Low',
    complainantName: 'Williams, Karen', licenseNumber: 'PI-2025-00234',
    physicalAddress: '318 N College Ave, Fayetteville, AR 72701', emailAddress: 'd.carter@email.com',
    filingMethod: 'Mail', incidentDate: '04/25/2026', legacyCaseNumber: '',
    description: 'The investigator took a retainer for a background investigation and never delivered a report or returned calls over a six week period.'
  },
  {
    caseNumber: 'CM-2026-0312', dateReceived: '04/10/2026', caseSubject: 'Delta Force Protection LLC',
    status: 'Pending', assignedTo: 'Sgt. Thompson', caseType: 'Complaint', priority: 'High',
    complainantName: 'Thompson, James', licenseNumber: 'SB-2022-00671',
    physicalAddress: '800 W Sunset Ave, Springdale, AR 72764', emailAddress: 'info@deltaforceprotection.com',
    filingMethod: 'Email', incidentDate: '04/01/2026', legacyCaseNumber: 'LEG-2022-0441',
    description: 'Company advertised armed guard services on its website while its armed endorsement had lapsed.'
  },
  {
    caseNumber: 'CM-2026-0318', dateReceived: '04/14/2026', caseSubject: 'Williams, James',
    status: 'Pending', assignedTo: 'Agent Harris', caseType: 'Complaint', priority: 'Medium',
    complainantName: 'Brown, Angela', licenseNumber: 'AG-2024-00318',
    physicalAddress: '519 Union St, Jonesboro, AR 72401', emailAddress: 'j.williams@email.com',
    filingMethod: 'Personal Visit', incidentDate: '04/05/2026', legacyCaseNumber: '',
    description: 'Guard was on duty without a visible license badge and could not provide an identification number when asked.'
  },
  {
    caseNumber: 'CM-2026-0325', dateReceived: '04/19/2026', caseSubject: 'Premier Security Group',
    status: 'Pending', assignedTo: 'Sgt. Williams', caseType: 'Complaint', priority: 'Medium',
    complainantName: 'Martinez, David', licenseNumber: 'SB-2021-00955',
    physicalAddress: '1105 Oak St, Conway, AR 72032', emailAddress: 'contact@premiersecurity.com',
    filingMethod: 'Fax', incidentDate: '04/10/2026', legacyCaseNumber: '',
    description: 'Complainant alleges the company billed for guard hours that were never worked at a construction site.'
  },
  {
    caseNumber: 'CM-2026-0280', dateReceived: '03/15/2026', caseSubject: 'Roberts, Kevin',
    status: 'Closed', assignedTo: 'Agent Davis', caseType: 'Complaint', priority: 'Low',
    complainantName: 'Lee, Sandra', licenseNumber: 'FD-2023-00127',
    physicalAddress: '2200 S 8th St, Rogers, AR 72756', emailAddress: 'k.roberts@email.com',
    filingMethod: 'Staff Discovery', incidentDate: '03/05/2026', legacyCaseNumber: '',
    description: 'Records review found the dealer had not filed required transfer logs for the prior quarter.',
    outcomes: ['Warning Letter']
  },
  {
    caseNumber: 'CM-2026-0295', dateReceived: '03/22/2026', caseSubject: 'Stone Security Services',
    status: 'Closed', assignedTo: 'Sgt. Thompson', caseType: 'Complaint', priority: 'High',
    complainantName: 'Anderson, Michael', licenseNumber: 'SB-2020-00483',
    physicalAddress: '600 Main St, Pine Bluff, AR 71601', emailAddress: 'info@stonesecurity.com',
    filingMethod: 'Judicial Decision', incidentDate: '03/12/2026', legacyCaseNumber: 'LEG-2020-0118',
    description: 'Court referral following a judgment involving unlicensed guard placement.',
    outcomes: ['Consent Decree / Fine', 'Suspension']
  },
  {
    caseNumber: 'CM-2026-0301', dateReceived: '03/28/2026', caseSubject: 'Adams, Patricia',
    status: 'Closed', assignedTo: 'Agent Harris', caseType: 'Complaint', priority: 'Medium',
    complainantName: 'Wilson, George', licenseNumber: 'PI-2024-00561',
    physicalAddress: '742 Kavanaugh Blvd, Little Rock, AR 72205', emailAddress: 'p.adams@email.com',
    filingMethod: 'Board Order', incidentDate: '03/18/2026', legacyCaseNumber: '',
    description: 'Board order directed review of the investigator\'s advertising claims.',
    outcomes: ['Unfounded']
  }
];

var CASE_STORE_KEY = 'rlp.cases.v1';

function loadCaseOverrides() {
  try {
    return JSON.parse(sessionStorage.getItem(CASE_STORE_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveCaseOverrides(overrides) {
  try {
    sessionStorage.setItem(CASE_STORE_KEY, JSON.stringify(overrides));
  } catch (e) { /* prototype — a full storage quota is not worth handling */ }
}

/** Every case: the seed with session edits applied, plus cases created this session. */
function caseList() {
  var overrides = loadCaseOverrides();
  var seeded = CASE_SEED.map(function (c) {
    var patch = overrides[c.caseNumber];
    if (!patch) return c;
    var merged = {};
    Object.keys(c).forEach(function (k) { merged[k] = c[k]; });
    Object.keys(patch).forEach(function (k) { merged[k] = patch[k]; });
    return merged;
  });

  var seedNumbers = CASE_SEED.map(function (c) { return c.caseNumber; });
  var created = Object.keys(overrides)
    .filter(function (n) { return seedNumbers.indexOf(n) === -1; })
    .map(function (n) { return overrides[n]; });

  return created.concat(seeded);
}

function getCase(caseNumber) {
  return caseList().filter(function (c) { return c.caseNumber === caseNumber; })[0] || null;
}

function updateCase(caseNumber, patch) {
  var overrides = loadCaseOverrides();
  var existing = overrides[caseNumber] || {};

  /* Patches layer onto whatever is already stored — for a seed case that is
     just the edited fields, for a case created this session the whole record. */
  var next = {};
  Object.keys(existing).forEach(function (k) { next[k] = existing[k]; });
  Object.keys(patch).forEach(function (k) { next[k] = patch[k]; });

  overrides[caseNumber] = next;
  saveCaseOverrides(overrides);
}

function addCase(newCase) {
  var overrides = loadCaseOverrides();
  overrides[newCase.caseNumber] = newCase;
  saveCaseOverrides(overrides);
}

/** Cases are numbered CM-<year>-<sequence>; the sequence continues per session. */
function nextCaseNumber() {
  var counter = parseInt(sessionStorage.getItem('rlp.caseCounter') || '349', 10) + 1;
  sessionStorage.setItem('rlp.caseCounter', String(counter));
  return 'CM-' + new Date().getFullYear() + '-' + String(counter).padStart(4, '0');
}

var LICENSE_TYPE_BY_PREFIX = {
  PI: 'Private Investigator',
  SB: 'Security Business',
  AG: 'Armed Guard',
  FD: 'Firearms Dealer'
};

function licenseTypeFromNumber(licenseNumber) {
  if (!licenseNumber) return '—';
  return LICENSE_TYPE_BY_PREFIX[licenseNumber.split('-')[0]] || '—';
}

/**
 * A case can name several subjects. The seed carries one on the case record
 * itself, plus any the user added, so derive the list rather than storing it twice.
 */
function caseSubjects(c) {
  if (!c) return [];
  var primary = {
    name: c.caseSubject,
    licenseNumber: c.licenseNumber || '—',
    licenseType: licenseTypeFromNumber(c.licenseNumber),
    physicalAddress: c.physicalAddress || '—',
    email: c.emailAddress || '—'
  };
  return [primary].concat(c.extraSubjects || []);
}

/* Per-case collections (investigations, hearings, documents, notes) */
function caseCollection(caseNumber, name) {
  try {
    return JSON.parse(sessionStorage.getItem('rlp.' + name + '.' + caseNumber) || 'null');
  } catch (e) {
    return null;
  }
}

function saveCaseCollection(caseNumber, name, items) {
  try {
    sessionStorage.setItem('rlp.' + name + '.' + caseNumber, JSON.stringify(items));
  } catch (e) { /* prototype */ }
}

function escapeHtml(text) {
  var div = document.createElement('div');
  div.textContent = text == null ? '' : text;
  return div.innerHTML;
}

function formatIsoDate(value) {
  if (!value) return '—';
  var parts = value.split('-');
  return parts[1] + '/' + parts[2] + '/' + parts[0];
}

function formatIsoTime(value) {
  if (!value) return '—';
  var parts = value.split(':').map(Number);
  var period = parts[0] >= 12 ? 'PM' : 'AM';
  var hour = parts[0] % 12 || 12;
  return hour + ':' + String(parts[1]).padStart(2, '0') + ' ' + period;
}

function todayDisplay() {
  var t = new Date();
  return String(t.getMonth() + 1).padStart(2, '0') + '/' +
         String(t.getDate()).padStart(2, '0') + '/' + t.getFullYear();
}
