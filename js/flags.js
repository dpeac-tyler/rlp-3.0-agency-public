/**
 * Flag definition catalog — shared by Settings > Flags and the constituent
 * profile. Settings owns the list; the profile reads it so its "Add Flag"
 * picker only offers definitions that are Manual and Active.
 *
 * A definition's category is how the flag gets raised:
 *   Timer / Expiration / Event — raised automatically by rule
 *   Manual                     — applied by staff from a constituent profile
 *
 * `blocks` says whether a constituent carrying the flag can submit. Settings
 * appends it to the flag's settings line rather than giving it a column; the
 * profile reads the value straight off the definition when it applies a flag.
 *
 * Usage:
 *   <script src="js/flags.js"></script>
 *   var FLAGS = loadFlagDefinitions();   // persisted list, or the seed below
 *   saveFlagDefinitions(FLAGS);          // after any change
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'rlp.flag.definitions.v1';

  var SEED = [
    /* ── Timer ──────────────────────────────────────────────────────── */
    {
      key: 'APPROACHING_VOID',
      label: 'Approaching Void',
      category: 'Timer',
      description: 'Application is nearing the 120-day automatic void threshold for cumulative constituent-controlled days. Contact the applicant before the application voids.',
      settings: 'Warns at 1 day idle · voids at 10 days',
      blocks: 'No',
      status: 'Active'
    },

    /* ── Expiration ─────────────────────────────────────────────────── */
    {
      key: 'CONTINUING_EDUCATION_OVERDUE',
      label: 'Continuing Education Overdue',
      category: 'Expiration',
      description: 'Required continuing education hours are past due for the current renewal cycle.',
      settings: 'CE Cycle End Date · warns 60 days before · blank dates raise',
      blocks: 'Yes',
      status: 'Active'
    },
    {
      key: 'INSURANCE_EXPIRATION',
      label: 'Insurance Expiration',
      category: 'Expiration',
      description: 'Insurance policy on the license is expiring soon or has expired.',
      settings: 'Insurance Expiration Date · warns 30 days before · blank dates ignored',
      blocks: 'No',
      status: 'Active'
    },
    {
      key: 'LICENSE_EXPIRED',
      label: 'License Expired',
      category: 'Expiration',
      description: 'The license passed its expiration date without a completed renewal.',
      settings: 'License Expiration Date · warns 45 days before',
      blocks: 'Yes',
      status: 'Active'
    },

    /* ── Event ──────────────────────────────────────────────────────── */
    {
      key: 'BACKGROUND_CHECK_FAILED',
      label: 'Background Check Failed',
      category: 'Event',
      description: 'A returned background check came back with a disqualifying result. Event flags are permanent records; only administrators can clear them for data correction.',
      settings: 'Raised when "Background Check Result" is "Fail" · event date from "Result Received Date"',
      blocks: 'Yes',
      status: 'Active'
    },
    {
      key: 'FIREARM_DISCHARGE',
      label: 'Firearm Discharge',
      category: 'Event',
      description: 'A firearm discharge event was recorded against this license. Event flags are permanent records; only administrators can clear them for data correction.',
      settings: 'Raised when "Firearm Discharge Occurred" is "Yes" · details from "Firearm Discharge Details" · event date from "Last Discharge Date"',
      blocks: 'No',
      status: 'Active'
    },
    {
      key: 'FRAUDULENT_DOCUMENTATION',
      label: 'Fraudulent Documentation',
      category: 'Event',
      description: 'A submitted document was confirmed altered or falsified during review.',
      settings: 'Raised when "Document Review Outcome" is "Fraudulent" · event date from "Review Completed Date"',
      blocks: 'Yes',
      status: 'Active'
    },

    /* ── Manual ─────────────────────────────────────────────────────── */
    {
      key: 'DELINQUENT_PAYMENT',
      label: 'Delinquent Payment',
      category: 'Manual',
      description: 'An invoice on this account is past due. Clear once the payment posts.',
      settings: '',
      blocks: 'Yes',
      status: 'Active'
    },
    {
      key: 'INVESTIGATION_SUBJECT',
      label: 'Investigation Subject',
      category: 'Manual',
      description: 'License holder is under investigation. Clear when the investigation concludes.',
      settings: '',
      blocks: 'No',
      status: 'Active'
    },
    {
      key: 'OPEN_COMPLAINT_INVESTIGATION',
      label: 'Open Complaint Investigation',
      category: 'Manual',
      description: 'A complaint case against this license holder is open and under review.',
      settings: '',
      blocks: 'No',
      status: 'Active'
    },
    {
      key: 'PENDING_SUPERVISOR_REVIEW',
      label: 'Pending Supervisor Review',
      category: 'Manual',
      description: 'Application or license needs additional scrutiny from a supervisor before further action.',
      settings: '',
      blocks: 'No',
      status: 'Inactive'
    },
    {
      key: 'SPECIAL_EXEMPTION_APPROVED',
      label: 'Special Exemption Approved',
      category: 'Manual',
      description: 'A non-standard waiver or exemption was granted for this record.',
      settings: '',
      blocks: 'No',
      status: 'Active'
    }
  ];

  function clone(list) {
    return list.map(function (item) {
      var copy = {};
      Object.keys(item).forEach(function (k) { copy[k] = item[k]; });
      return copy;
    });
  }

  window.loadFlagDefinitions = function () {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.length) return parsed;
    } catch (e) { /* storage unavailable — fall through to the seed */ }
    return clone(SEED);
  };

  window.saveFlagDefinitions = function (definitions) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(definitions));
    } catch (e) { /* storage unavailable — ignore */ }
  };

  /* The profile's Add Flag picker: manual definitions still in service */
  window.manualFlagDefinitions = function () {
    return window.loadFlagDefinitions().filter(function (d) {
      return d.category === 'Manual' && d.status === 'Active';
    });
  };
})();
