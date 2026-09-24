/**
 * Question Builder (Build phase, step 1).
 *
 * The form is one flat, ordered list of blocks. Sections are markers in the
 * list, not containers, which keeps ordering and the condition check simple:
 * a follow-up question only has to sit somewhere below the question it
 * depends on.
 *
 * Three panels read from that list. The left panel adds types (or shows the
 * outline), the center renders the applicant's form and is where blocks are
 * selected and moved, and the right panel edits the selected block. Every
 * add and every move has a click path and a keyboard path; drag and drop is
 * a shortcut layered on top and nothing depends on it.
 *
 * Structural changes (add, move, duplicate, delete, type change) go through
 * commit(), which keeps a 40-step undo history and announces the result in
 * the toast's live region. Text edits in the settings panel are live and are
 * not individually undoable, the same as the Claude Design reference.
 *
 * Conditions are authored on the next step. This screen only respects them:
 * a question another depends on cannot be deleted or change type, and no
 * move may put a follow-up above its parent.
 *
 * Markup contract: builder-question-builder.html.
 */
function initQuestionBuilder() {

  /* v2's nine question types, named as v2 names them, plus the Section and
     Description blocks from v2's Review Questions page */
  var ICONS = {
    'Free Form': 'fa-solid fa-font',
    'Multiple Choice': 'fa-regular fa-circle-dot',
    'Multi-Select': 'fa-regular fa-square-check',
    'Yes/No; Either/Or': 'fa-solid fa-toggle-on',
    'Date / Date Range': 'fa-regular fa-calendar',
    'Table': 'fa-solid fa-table',
    'Table (Row Labels)': 'fa-solid fa-table-list',
    'Addresses / Repeatable Fields': 'fa-regular fa-clone',
    'Acknowledgment': 'fa-solid fa-file-signature',
    'Section': 'fa-solid fa-heading',
    'Description': 'fa-solid fa-paragraph'
  };

  var GROUPS = [
    ['Answers', ['Free Form', 'Multiple Choice', 'Multi-Select', 'Yes/No; Either/Or']],
    ['Data', ['Date / Date Range', 'Table', 'Table (Row Labels)', 'Addresses / Repeatable Fields']],
    ['Content', ['Acknowledgment', 'Section', 'Description']]
  ];

  var QTYPES = ['Acknowledgment', 'Addresses / Repeatable Fields', 'Date / Date Range', 'Free Form',
    'Multiple Choice', 'Multi-Select', 'Table', 'Table (Row Labels)', 'Yes/No; Either/Or'];

  var CHOICE_TYPES = ['Multiple Choice', 'Multi-Select'];
  var TABLE_TYPES = ['Table', 'Table (Row Labels)'];

  /* v2's character limits on the question text, per type */
  var TEXT_LIMITS = {
    'Free Form': 300, 'Date / Date Range': 300, 'Acknowledgment': 5000
  };
  var TEXT_LIMIT_DEFAULT = 500;
  var DESC_LIMIT = 5000;
  var SECTION_DESC_LIMIT = 1000;
  var INSTR_LIMIT = 3000;

  var LENGTHS = {
    small: 'Small (up to 70 characters)',
    medium: 'Medium (up to 300 characters)',
    large: 'Large (up to 1000 characters)',
    extralarge: 'X-Large (up to 5000 characters)',
    custom: 'Custom (user-entered character count)'
  };

  var NUM_FORMATS = { currency: 'Currency', decimal: 'Decimal', integer: 'Integer', percentage: 'Percentage' };
  var NUM_PLACEHOLDERS = { currency: '$ 0.00', decimal: '0.00', integer: '0', percentage: '0 %' };

  /* Table columns can hold dates; the extra columns on a row-label table
     cannot, since they may be summed */
  var COL_FORMATS = { alphanumeric: 'Alpha Numeric', numeric: 'Numeric', date: 'Date Field' };
  var COL_FORMATS_RL = { alphanumeric: 'Alpha Numeric', numeric: 'Numeric' };

  /* v2's field sets for an Addresses / Repeatable Fields question */
  var FIELD_SETS = [
    ['Business Information', ['Business Name', 'Position/Job Title', 'Branch Name/Number', 'Doing Business As', 'Date']],
    ['Personal Information', ['Prefix', 'First Name', 'Middle Name', 'Last Name', 'Suffix', 'Maiden Name']],
    ['ID Information', ['Date of Birth', 'Social Security Number', 'Alias']],
    ['Address Information', ['Address Line 1', 'Address Line 2', 'City/APO/DPO/FPO', 'State', 'Zip Code', 'County']],
    ['Contact Information', ['Telephone Number', 'Alt. Telephone Number', 'Email Address']]
  ];

  var HISTORY_LIMIT = 40;
  var TOAST_MS = 7000;

  var state = {
    blocks: [
      { id: 's1', kind: 'section', title: 'Vessel information', text: 'Tell us about the vessel you will use for commercial fishing.' },
      { id: 'q1', kind: 'q', type: 'Free Form', text: 'Vessel name', req: true, fmt: 'alphanumeric', len: 'small' },
      { id: 'q2', kind: 'q', type: 'Free Form', text: 'State registration number', req: true, fmt: 'alphanumeric', len: 'small' },
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
      { id: 'q12', kind: 'q', type: 'Table', text: 'Crew members', req: false, reqRows: 0,
        cols: [{ name: 'Name', fmt: 'alphanumeric' }, { name: 'Role', fmt: 'alphanumeric' }, { name: 'License No.', fmt: 'alphanumeric' }] },
      { id: 's3', kind: 'section', title: 'Declarations', text: '' },
      { id: 'q13', kind: 'q', type: 'Acknowledgment', text: 'I certify that the information provided is true and complete.', req: true }
    ],
    sel: 'q7',
    mode: 'build',
    left: 'add',
    history: [],
    menu: null,   /* { at, filter, idx } while an Add here popover is open */
    move: null    /* { id, from, to } while the Move to dialog is open */
  };

  var uid = 100;
  var drag = null;
  var toastTimer = null;

  var qb = document.getElementById('qb');
  var blocksEl = document.getElementById('blocks');
  var settingsEl = document.getElementById('settings');
  var outlineEl = document.getElementById('outline');
  var paletteEl = document.getElementById('type-palette');
  var undoBtn = document.getElementById('undo-btn');

  /* Helpers ---------------------------------------------------------------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* Question text is rich text; labels, outline rows and announcements
     need it flat */
  var flattener = document.createElement('div');
  function plain(html) {
    flattener.innerHTML = html || '';
    return flattener.textContent.replace(/\s+/g, ' ').trim();
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function trunc(s, n) {
    n = n || 52;
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function clone(bl) { return JSON.parse(JSON.stringify(bl)); }

  function find(id) {
    for (var i = 0; i < state.blocks.length; i++) if (state.blocks[i].id === id) return state.blocks[i];
    return null;
  }

  function indexOf(bl, id) {
    for (var i = 0; i < bl.length; i++) if (bl[i].id === id) return i;
    return -1;
  }

  /* Questions are numbered 1..n in document order; sections and
     descriptions don't take a number */
  function nums(bl) {
    var m = {}, n = 0;
    bl.forEach(function (b) { if (b.kind === 'q') m[b.id] = ++n; });
    return m;
  }

  function name(b, nm) {
    if (b.kind === 'q') return 'Question ' + nm[b.id];
    if (b.kind === 'section') return 'section “' + b.title + '”';
    return 'the description';
  }

  /* Every follow-up sits below the question it depends on */
  function valid(bl) {
    var ix = {};
    bl.forEach(function (b, i) { ix[b.id] = i; });
    return bl.every(function (b, i) {
      return !b.cond || (ix[b.cond.on] !== undefined && ix[b.cond.on] < i);
    });
  }

  function deps(bl, id) {
    return bl.filter(function (b) { return b.cond && b.cond.on === id; });
  }

  /* A section header travels with its questions, up to the next section */
  function range(bl, i) {
    if (bl[i].kind !== 'section') return [i, i];
    var j = i + 1;
    while (j < bl.length && bl[j].kind !== 'section') j++;
    return [i, j - 1];
  }

  function sectionOf(bl, i) {
    for (var k = i; k >= 0; k--) if (bl[k].kind === 'section') return bl[k];
    return null;
  }

  function make(type) {
    var id = 'n' + (++uid);
    if (type === 'Section') return { id: id, kind: 'section', title: 'New section', text: '' };
    if (type === 'Description') return { id: id, kind: 'desc', text: 'Add instructions or context for applicants.' };
    var b = { id: id, kind: 'q', type: type, text: type === 'Acknowledgment' ? 'I acknowledge that…' : 'Untitled question', req: false };
    applyTypeDefaults(b, null);
    return b;
  }

  /* Fills in what a type needs when a question becomes that type, using v2's
     starting values. Choices survive a switch between the two choice types. */
  function applyTypeDefaults(b, fromType) {
    var t = b.type;
    if (CHOICE_TYPES.indexOf(t) > -1 && CHOICE_TYPES.indexOf(fromType) < 0) b.opts = ['Choice 1', 'Choice 2'];
    if (t === 'Yes/No; Either/Or' && fromType !== t) b.opts = ['Yes', 'No'];
    if (t === 'Free Form' && !b.fmt) { b.fmt = 'alphanumeric'; b.len = 'medium'; }
    if (t === 'Table' && fromType !== t) {
      b.cols = [{ name: 'Header 1', fmt: 'alphanumeric' }, { name: 'Header 2', fmt: 'alphanumeric' }];
      b.reqRows = 0;
    }
    if (t === 'Table (Row Labels)' && fromType !== t) {
      b.rowHead = 'Header 1';
      b.agencyRows = true;
      b.rows = ['Row 1'];
      b.cols = [{ name: 'Header 2', fmt: 'alphanumeric' }];
      b.reqRows = 0;
      b.colAgg = 'none';
      b.rowAgg = 'none';
      b.grand = false;
    }
    if (t === 'Addresses / Repeatable Fields' && !b.fields) {
      b.min = 0;
      b.fields = { 'Address Line 1': 'r', 'Address Line 2': 'd', 'City/APO/DPO/FPO': 'r', 'State': 'r', 'Zip Code': 'r' };
    }
  }

  function textLimit(b) {
    if (b.kind === 'desc') return DESC_LIMIT;
    if (b.kind === 'section') return SECTION_DESC_LIMIT;
    return TEXT_LIMITS[b.type] || TEXT_LIMIT_DEFAULT;
  }

  function isTyping(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }

  function blockEl(id) { return blocksEl.querySelector('[data-block="' + id + '"]'); }

  /* Toast / live region ------------------------------------------------------ */

  var toast = document.getElementById('toast');
  var toastText = document.getElementById('toast-text');
  var toastIcon = document.getElementById('toast-icon');
  var toastUndo = document.getElementById('toast-undo');

  function say(msg, withUndo, warn) {
    clearTimeout(toastTimer);
    toast.classList.toggle('toast--warning', !!warn);
    toastIcon.className = warn ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check';
    toastUndo.hidden = !withUndo;
    /* Emptied first, so the same message twice is still announced twice */
    toastText.textContent = '';
    setTimeout(function () { toastText.textContent = msg; }, 30);
    toast.classList.add('is-visible');
    toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, TOAST_MS);
  }

  function warn(msg) { say(msg, false, true); }

  toastUndo.addEventListener('click', function () { undo(); });

  /* History ------------------------------------------------------------------- */

  /* opts.sel: block to select afterwards. opts.focus: what gets focus once
     the canvas has redrawn ({ block }, { tool, id }, or 'text'). */
  function commit(next, opts, msg) {
    opts = opts || {};
    state.history.push(clone(state.blocks));
    if (state.history.length > HISTORY_LIMIT) state.history.shift();
    state.blocks = next;
    if (opts.sel !== undefined) state.sel = opts.sel;
    state.menu = null;
    /* Settings redraw too: a move renumbers the selected question */
    renderAll(true);
    after(opts);
    if (msg) say(msg, true);
    document.getElementById('saved-note').textContent = 'saved just now';
  }

  function undo() {
    if (!state.history.length) return;
    state.blocks = state.history.pop();
    if (!find(state.sel)) state.sel = null;
    state.menu = null;
    renderAll(true);
    say('Undone.', false);
  }

  /* Focus and scroll after a redraw */
  function after(opts) {
    var id = opts.reveal || (opts.focus && opts.focus.id) || opts.sel;
    if (id) reveal(id);
    var f = opts.focus;
    if (!f) return;
    if (f === 'text') {
      focusText();
    } else if (f.tool) {
      var btn = blocksEl.querySelector('[data-block="' + f.id + '"] [data-tool="' + f.tool + '"]');
      if (btn) { rove(btn); btn.focus({ preventScroll: true }); }
    } else if (f.block) {
      var el = blockEl(f.block);
      if (el) el.focus({ preventScroll: true });
    }
  }

  function reveal(id) {
    var el = blockEl(id);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /* After adding, focus lands in the new block's text with the text selected,
     so the admin can type straight over the placeholder */
  function focusText() {
    var el = document.getElementById('set-title') || document.getElementById('set-text');
    if (!el) return;
    el.focus({ preventScroll: true });
    if (el.select) {
      el.select();
    } else {
      var r = document.createRange();
      r.selectNodeContents(el);
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
  }

  /* Structural operations ------------------------------------------------------ */

  function insert(pos, type) {
    var b = make(type);
    var bl = state.blocks.slice();
    bl.splice(pos, 0, b);
    var nm = nums(bl);
    var prev = bl[pos - 1];
    var where = prev ? 'after ' + name(prev, nm) : 'at the top of the form';
    commit(bl, { sel: b.id, focus: 'text' },
      type + ' added ' + where + (b.kind === 'q' ? ', now Question ' + nm[b.id] : '') + '.');
  }

  function addAfterSel(type) {
    var i = indexOf(state.blocks, state.sel);
    insert(i >= 0 ? i + 1 : state.blocks.length, type);
  }

  /* dir -1 up, 1 down. A section moves with all of its questions, past the
     whole neighbouring section. */
  function step(id, dir, focus) {
    var bl = state.blocks;
    var i = indexOf(bl, id);
    if (i < 0) return;
    var nm = nums(bl);
    var b = bl[i];
    var out;

    if (b.kind === 'section') {
      var r = range(bl, i);
      var grp = bl.slice(r[0], r[1] + 1);
      var rest = bl.slice(0, r[0]).concat(bl.slice(r[1] + 1));
      if (dir < 0) {
        var p = r[0] - 1;
        while (p >= 0 && bl[p].kind !== 'section') p--;
        if (p < 0) return warn('This section is already first.');
        out = rest.slice(0, p).concat(grp, rest.slice(p));
      } else {
        if (r[1] + 1 >= bl.length) return warn('This section is already last.');
        var e2 = range(bl, r[1] + 1)[1];
        var at = e2 - grp.length + 1;
        out = rest.slice(0, at).concat(grp, rest.slice(at));
      }
    } else {
      var j = i + dir;
      if (j < 0 || j >= bl.length) return warn(cap(name(b, nm)) + ' is already ' + (dir < 0 ? 'first' : 'last') + '.');
      out = bl.slice();
      out[i] = bl[j];
      out[j] = b;
    }

    if (!valid(out)) return warn('Can’t move there: a follow-up question must stay below the question it depends on.');
    var n2 = nums(out);
    commit(out, { focus: focus, reveal: id },
      b.kind === 'q'
        ? name(b, nm) + ' moved ' + (dir < 0 ? 'up' : 'down') + ', now Question ' + n2[b.id] + '.'
        : cap(name(b, nm)) + ' moved ' + (dir < 0 ? 'up' : 'down') + '.');
  }

  function dup(id) {
    var bl = state.blocks.slice();
    var i = indexOf(bl, id);
    var copy = clone([bl[i]])[0];
    copy.id = 'n' + (++uid);
    bl.splice(i + 1, 0, copy);
    var nm = nums(bl);
    commit(bl, { sel: copy.id, focus: { block: copy.id } },
      copy.kind === 'q' ? 'Duplicated as Question ' + nm[copy.id] + '.' : 'Duplicated.');
  }

  function del(id) {
    var bl = state.blocks;
    var i = indexOf(bl, id);
    var b = bl[i];
    var nm = nums(bl);
    var d = deps(bl, id);
    if (d.length) return warn('Can’t delete: Question ' + nm[d[0].id] + ' depends on this answer. Remove that condition first.');
    var out = bl.filter(function (x) { return x.id !== id; });
    var next = out[Math.min(i, out.length - 1)];
    commit(out, { sel: next ? next.id : null, focus: next ? { block: next.id } : null },
      cap(name(b, nm)) + ' deleted' + (b.kind === 'section' ? ', its questions joined the section above' : '') + '.');
  }

  /* Places the block (or a whole section) so that it lands right after the
     block at index `after` in the current list. -1 is the top of the form. */
  function moveAfter(id, after) {
    var bl = state.blocks;
    var from = indexOf(bl, id);
    if (from < 0) return;
    var pos = after + 1;
    var r = range(bl, from);
    if (pos > r[0] && pos <= r[1] + 1) return;
    var grp = bl.slice(r[0], r[1] + 1);
    var rest = bl.slice(0, r[0]).concat(bl.slice(r[1] + 1));
    var at = pos > r[1] ? pos - grp.length : pos;
    var out = rest.slice(0, at).concat(grp, rest.slice(at));
    if (!valid(out)) return warn('Can’t move there: a follow-up question must stay below the question it depends on.');
    var b = bl[from];
    var nm = nums(bl);
    var n2 = nums(out);
    commit(out, { sel: b.id, focus: { block: b.id } },
      b.kind === 'q' ? name(b, nm) + ' moved, now Question ' + n2[b.id] + '.' : cap(name(b, nm)) + ' moved.');
  }

  function changeType(t) {
    var b = find(state.sel);
    if (!b || b.type === t) return;
    if (deps(state.blocks, b.id).length) return warn('Can’t change the type: another question depends on this answer.');
    var next = clone(state.blocks);
    var nb = next[indexOf(next, b.id)];
    var from = nb.type;
    nb.type = t;
    applyTypeDefaults(nb, from);
    commit(next, {}, 'Changed to ' + t + '.');
    var sel = document.getElementById('set-type');
    if (sel) sel.focus();
  }

  function select(id, focusBlock) {
    var changed = state.sel !== id;
    state.sel = id;
    closeMenu(false);
    renderAll(changed);
    if (id) reveal(id);
    if (focusBlock && id) {
      var el = blockEl(id);
      if (el) el.focus({ preventScroll: true });
    }
  }

  /* Rendering ------------------------------------------------------------------ */

  function renderAll(withSettings) {
    renderCanvas();
    renderOutline();
    renderPalette();
    renderCounts();
    if (withSettings) renderSettings();
  }

  function renderCounts() {
    var q = 0, s = 0;
    state.blocks.forEach(function (b) { if (b.kind === 'q') q++; if (b.kind === 'section') s++; });
    document.getElementById('form-count').innerHTML =
      '<strong>' + q + '</strong> question' + (q === 1 ? '' : 's') + ' &middot; ' + s + ' section' + (s === 1 ? '' : 's');
    document.getElementById('outline-count').textContent = q + ' question' + (q === 1 ? '' : 's');
    undoBtn.disabled = !state.history.length;
  }

  function addRowHTML(i, label) {
    var open = state.menu && state.menu.at === i;
    return '<div class="qb-add' + (open ? ' is-open' : '') + '" data-add-row="' + i + '">' +
      '<button type="button" class="qb-add__btn" data-add="' + i + '" aria-expanded="' + open + '"' +
        (open ? ' aria-controls="add-menu"' : '') + ' aria-label="' + esc(label) + '">' +
        '<i class="fa-solid fa-plus" aria-hidden="true"></i> <span data-add-text>Add here</span>' +
      '</button>' +
    '</div>';
  }

  function controlHTML(b) {
    var t = b.type;
    var opts = b.opts || [];
    var cols = b.cols || [];

    function box(text, cls, icon, style) {
      return '<div class="preview-field__input qb-q__box' + (cls ? ' ' + cls : '') + '"' + (style ? ' style="' + style + '"' : '') + '>' +
        esc(text || '') + (icon ? '<i class="' + icon + '"></i>' : '') + '</div>';
    }

    function choices(icon, inline, list) {
      return '<ul class="qb-q__choices' + (inline ? ' qb-q__choices--inline' : '') + '">' +
        list.map(function (o) {
          return '<li class="qb-q__choice"><i class="' + icon + '"></i>' + (esc(o) || '&nbsp;') + '</li>';
        }).join('') + '</ul>';
    }

    function dateBox(label) {
      return '<div><div class="preview-field__note" style="margin: 0 0 4px">' + label + '</div>' +
        box('mm/dd/yyyy', 'qb-q__box--short', 'fa-regular fa-calendar', 'width: 220px') + '</div>';
    }

    switch (t) {
      case 'Free Form':
        if (b.fmt === 'numeric') return box(NUM_PLACEHOLDERS[b.numFmt] || '0', 'qb-q__box--short');
        return box('', '', '', b.len === 'large' || b.len === 'extralarge' ? 'height: 96px' : '');
      case 'Date / Date Range':
        if (b.range) return '<div style="display: flex; gap: 16px; flex-wrap: wrap">' + dateBox('Start date') + dateBox('End date') + '</div>';
        return box('mm/dd/yyyy', 'qb-q__box--short', 'fa-regular fa-calendar');
      case 'Multiple Choice': return choices('fa-regular fa-circle', false, opts);
      case 'Multi-Select': return choices('fa-regular fa-square', false, opts);
      case 'Yes/No; Either/Or': return choices('fa-regular fa-circle', true, opts);
      case 'Table':
        var rows = Math.max(1, b.reqRows || 0);
        var body = '';
        for (var r = 0; r < rows; r++) body += '<tr>' + cols.map(function () { return '<td></td>'; }).join('') + '</tr>';
        return '<table class="qb-q__table"><thead><tr>' +
          cols.map(function (c) { return '<th>' + (esc(c.name) || '&nbsp;') + '</th>'; }).join('') +
          '</tr></thead><tbody>' + body + '</tbody></table>' +
          '<span class="qb-q__fake-btn qb-q__fake-btn--warm">Add Row</span>';
      case 'Table (Row Labels)':
        return rowLabelTableHTML(b);
      case 'Addresses / Repeatable Fields':
        var shown = [];
        FIELD_SETS.forEach(function (s) { s[1].forEach(function (f) { if (b.fields && b.fields[f]) shown.push(f); }); });
        if (!shown.length) return '<p class="preview-field__note" style="margin: 0">No fields chosen yet.</p>';
        return '<div class="qb-q__set">' + shown.map(function (f) {
          return '<div class="qb-q__set-field"><div class="preview-field__note" style="margin: 0 0 4px">' + esc(f) +
            (b.fields[f] === 'r' ? ' <em>Required</em>' : '') + '</div>' + box('') + '</div>';
        }).join('') + '</div>' +
          '<span class="qb-q__fake-btn qb-q__fake-btn--warm">Add More</span>';
    }
    return '';
  }

  /* The row-label table: agency rows down the first column, the extra
     columns across, and the totals v2 can add along either edge */
  function rowLabelTableHTML(b) {
    var cols = b.cols || [];
    var rowSum = b.rowAgg === 'sum';
    var colSum = b.colAgg === 'sum';
    var rows = b.agencyRows ? (b.rows || []) : new Array(Math.max(1, b.reqRows || 0)).fill('');
    var empty = cols.map(function () { return '<td></td>'; }).join('') + (rowSum ? '<td></td>' : '');

    var h = '<table class="qb-q__table"><thead><tr><th>' + (esc(b.rowHead) || '&nbsp;') + '</th>' +
      cols.map(function (c) { return '<th>' + (esc(c.name) || '&nbsp;') + '</th>'; }).join('') +
      (rowSum ? '<th>Total</th>' : '') + '</tr></thead><tbody>';
    rows.forEach(function (label) {
      h += '<tr>' + (b.agencyRows ? '<th scope="row" class="qb-q__row-label">' + (esc(label) || '&nbsp;') + '</th>' : '<td></td>') + empty + '</tr>';
    });
    h += '</tbody>';
    if (colSum || b.grand) {
      h += '<tfoot><tr><th scope="row" class="qb-q__row-label">' + (colSum ? 'Total' : '&nbsp;') + '</th>' +
        cols.map(function () { return '<td></td>'; }).join('') +
        (rowSum ? '<td>' + (b.grand ? 'Grand Total' : '') + '</td>' : '') + '</tr>' +
        (b.grand && !rowSum ? '<tr><th scope="row" class="qb-q__row-label">Grand Total</th><td colspan="' + cols.length + '"></td></tr>' : '') +
        '</tfoot>';
    }
    h += '</table>';
    if (!b.agencyRows) h += '<span class="qb-q__fake-btn qb-q__fake-btn--warm">Add Row</span>';
    return h;
  }

  function blockHTML(b, i, ctx) {
    var sel = ctx.build && b.id === state.sel;
    var isQ = b.kind === 'q';
    var n = ctx.nm[b.id];
    var label = isQ ? 'Question ' + n + ', ' + b.type + ': ' + plain(b.text)
      : b.kind === 'section' ? 'Section: ' + b.title : 'Description: ' + trunc(plain(b.text), 80);
    var cls = 'qb-block qb-block--' + b.kind + (sel ? ' is-selected' : '') + (b.cond ? ' is-followup' : '');

    var h = '<div class="' + cls + '" data-block="' + b.id + '" role="group"' +
      ' tabindex="' + (ctx.build ? 0 : -1) + '"' + (ctx.build ? ' draggable="true"' : '') +
      ' aria-label="' + esc(label + (sel ? ', selected' : '')) + '">';

    if (sel) {
      var locked = deps(state.blocks, b.id).length > 0;
      var toolName = cap(name(b, ctx.nm));
      h += '<div class="qb-block__head">' +
        '<span class="qb-block__badge">' + (isQ ? 'Q' + n + ' &middot; ' + esc(b.type) : b.kind === 'section' ? 'Section' : 'Description') + '</span>' +
        '<div class="qb-tools" role="toolbar" aria-label="' + esc(toolName) + ' actions">' +
          tool('up', 'fa-solid fa-arrow-up', 'Up') +
          tool('down', 'fa-solid fa-arrow-down', 'Down') +
          (b.kind !== 'section' ? tool('move', 'fa-solid fa-arrows-up-down', 'Move to…') : '') +
          tool('dup', 'fa-regular fa-copy', 'Duplicate') +
          tool('del', 'fa-regular fa-trash-can', 'Delete', locked) +
        '</div>' +
      '</div>';
    }

    if (b.cond) {
      h += '<p class="qb-block__cond"><i class="fa-solid fa-code-branch" aria-hidden="true"></i>' +
        'Shown when Question ' + ctx.nm[b.cond.on] + ' is ' + esc(b.cond.val) + '</p>';
    }

    if (b.kind === 'section') {
      h += '<h2 class="qb-section__bar">' + esc(b.title || 'Untitled section') + '</h2>';
      if (plain(b.text)) h += '<div class="qb-section__text">' + b.text + '</div>';
    } else if (b.kind === 'desc') {
      h += '<div class="qb-desc">' + b.text + '</div>';
    } else if (b.type === 'Acknowledgment') {
      h += '<div class="qb-q__ack" aria-hidden="true"><i class="fa-regular fa-square"></i>' +
        '<span class="qb-q__label">' + b.text + (b.req ? '<em>Required</em>' : '') + '</span></div>';
      if (b.instrOn && plain(b.instr)) h += '<div class="qb-q__instr">' + b.instr + '</div>';
    } else {
      h += '<div class="qb-q__label">' + b.text + (b.req ? '<em>Required</em>' : '') + '</div>';
      if (b.instrOn && plain(b.instr)) h += '<div class="qb-q__instr">' + b.instr + '</div>';
      h += '<div class="qb-q__control" aria-hidden="true">' + controlHTML(b) + '</div>';
    }

    return h + '</div>';

    function tool(key, icon, text, disabled) {
      return '<button type="button" class="qb-tools__btn" data-tool="' + key + '" tabindex="-1"' +
        (disabled ? ' aria-disabled="true"' : '') + '>' +
        '<i class="' + icon + '" aria-hidden="true"></i>' + text + '</button>';
    }
  }

  function renderCanvas() {
    var bl = state.blocks;
    var ctx = { nm: nums(bl), build: state.mode === 'build' };
    var h = '';
    if (!bl.length) {
      h += '<p class="qb-empty">This form has no questions yet. Add a type from the left, or use Add here below.</p>';
    }
    h += addRowHTML(-1, 'Add at the top of the form');
    bl.forEach(function (b, i) {
      h += blockHTML(b, i, ctx);
      h += addRowHTML(i, 'Add after ' + name(b, ctx.nm));
    });
    blocksEl.innerHTML = h;

    /* One tab stop per toolbar: the first tool, until arrows move it */
    var first = blocksEl.querySelector('.qb-tools__btn');
    if (first) first.tabIndex = 0;

    if (state.menu) mountMenu();
  }

  function renderOutline() {
    var bl = state.blocks;
    var nm = nums(bl);
    outlineEl.innerHTML = bl.map(function (b) {
      var isS = b.kind === 'section';
      var cls = 'qb-outline__row' + (isS ? ' qb-outline__row--section' : '') + (b.cond ? ' qb-outline__row--followup' : '');
      var icon = b.kind === 'q' ? ICONS[b.type] : ICONS[isS ? 'Section' : 'Description'];
      var text = isS ? b.title : b.kind === 'q' ? plain(b.text) : trunc(plain(b.text), 40);
      return '<li><button type="button" class="' + cls + '" data-outline="' + b.id + '"' +
        (b.id === state.sel ? ' aria-current="true"' : '') + '>' +
        (b.kind === 'q' ? '<span class="qb-outline__num"><span class="sr-only">Question </span>' + nm[b.id] + '</span>' : '') +
        '<i class="qb-outline__icon ' + icon + '" aria-hidden="true"></i>' +
        '<span>' + esc(text) + '</span></button></li>';
    }).join('');
  }

  var paletteBuilt = false;
  function renderPalette() {
    var sb = find(state.sel);
    var where = sb ? 'after ' + name(sb, nums(state.blocks)) : 'at the end of the form';
    document.getElementById('add-target-text').textContent = 'Adds ' + where;

    if (!paletteBuilt) {
      paletteEl.innerHTML = GROUPS.map(function (g, gi) {
        return '<h3 class="qb-group-label" id="grp-' + gi + '">' + g[0] + '</h3>' +
          '<ul class="qb-types" aria-labelledby="grp-' + gi + '">' + g[1].map(function (t) {
            return '<li><button type="button" class="qb-type" data-type="' + t + '" draggable="true">' +
              '<i class="' + ICONS[t] + '" aria-hidden="true"></i>' + t + '</button></li>';
          }).join('') + '</ul>';
      }).join('');
      paletteBuilt = true;
    }
    paletteEl.querySelectorAll('[data-type]').forEach(function (btn) {
      btn.setAttribute('aria-label', 'Add ' + btn.dataset.type + ' ' + where);
    });
  }

  /* Settings panel -------------------------------------------------------------- */

  function rteHTML(id, labelText, value, placeholder, limit, required) {
    return '<div class="field">' +
      '<label id="' + id + '-label">' + labelText + (required ? ' <span class="field-required">Required</span>' : '') + '</label>' +
      '<div class="rte">' +
        '<div class="rte__toolbar" role="toolbar" aria-label="' + esc(plain(labelText)) + ' formatting">' +
          rteBtn('bold', 'fa-bold', 'Bold') + rteBtn('italic', 'fa-italic', 'Italic') + rteBtn('underline', 'fa-underline', 'Underline') +
          '<span class="rte__divider" aria-hidden="true"></span>' +
          rteBtn('', 'fa-link', 'Link') +
          rteBtn('insertUnorderedList', 'fa-list-ul', 'Bulleted list') + rteBtn('insertOrderedList', 'fa-list-ol', 'Numbered list') +
        '</div>' +
        '<div class="rte__body" id="' + id + '" contenteditable="true" role="textbox" aria-multiline="true"' +
          ' aria-labelledby="' + id + '-label" aria-describedby="' + id + '-count"' +
          ' data-limit="' + limit + '" data-placeholder="' + esc(placeholder) + '">' + (value || '') + '</div>' +
      '</div>' +
      '<span class="char-counter" id="' + id + '-count" data-counter-for="' + id + '"></span>' +
    '</div>';

    function rteBtn(cmd, icon, text) {
      return '<button type="button" class="rte__btn"' + (cmd ? ' data-cmd="' + cmd + '"' : '') +
        ' title="' + text + '" aria-label="' + text + '"><i class="fa-solid ' + icon + '" aria-hidden="true"></i></button>';
    }
  }

  function renderSettings() {
    var b = state.mode === 'build' ? find(state.sel) : null;

    if (!b) {
      settingsEl.innerHTML =
        '<div class="qb-settings__empty">' +
          '<i class="fa-regular fa-hand-pointer" aria-hidden="true"></i>' +
          '<h2 class="qb-settings__empty-title">Nothing selected</h2>' +
          '<p>Click a block on the form, or Tab to it and press Enter, to edit its settings.</p>' +
        '</div>';
      return;
    }

    var nm = nums(state.blocks);
    var title = b.kind === 'q' ? 'Question ' + nm[b.id] : b.kind === 'section' ? 'Section' : 'Description';
    var h = '<div class="qb-settings__head"><div>' +
        '<div class="qb-settings__eyebrow">Selected</div>' +
        '<h2 class="qb-settings__title">' + title + '</h2>' +
      '</div>' +
      '<button type="button" class="icon-btn qb-settings__close" id="settings-close" aria-label="Close settings and deselect">' +
        '<i class="fa-solid fa-xmark" aria-hidden="true"></i></button>' +
    '</div><div class="qb-settings__body">';

    if (b.kind === 'section') {
      h += '<div class="field"><label for="set-title">Section title <span class="field-required">Required</span></label>' +
        '<input type="text" id="set-title" maxlength="150" value="' + esc(b.title) + '"></div>';
      h += rteHTML('set-text', 'Description', b.text, 'Optional. Shown under the section title.', SECTION_DESC_LIMIT);
      h += '<div class="info-notice"><i class="fa-solid fa-circle-info" aria-hidden="true"></i>' +
        '<div>Up and Down move the whole section, including its questions.</div></div>';
    } else if (b.kind === 'desc') {
      h += rteHTML('set-text', 'Text', b.text, 'Instructions or context for applicants.', DESC_LIMIT, true);
    } else {
      var locked = deps(state.blocks, b.id);
      if (locked.length) {
        h += '<div class="info-notice"><i class="fa-solid fa-lock" aria-hidden="true"></i><div>Question ' + nm[locked[0].id] +
          ' depends on this answer, so its type is locked and it can’t be deleted.</div></div>';
      } else if (b.cond) {
        h += '<div class="info-notice"><i class="fa-solid fa-code-branch" aria-hidden="true"></i><div>Only shown when Question ' +
          nm[b.cond.on] + ' is ' + esc(b.cond.val) + '. Edit this on the Conditions step.</div></div>';
      }

      h += '<div class="field"><label for="set-type">Question type</label>' +
        '<select id="set-type"' + (locked.length ? ' disabled aria-describedby="set-type-lock"' : '') + '>' +
        QTYPES.map(function (t) { return '<option' + (t === b.type ? ' selected' : '') + '>' + t + '</option>'; }).join('') +
        '</select>' +
        (locked.length ? '<span class="field-hint" id="set-type-lock">Locked while another question depends on it.</span>' : '') +
        '</div>';

      h += rteHTML('set-text', 'What is your question?', b.text,
        b.type === 'Acknowledgment' ? 'What the applicant is agreeing to.' : 'What you are asking the applicant.', textLimit(b), true);

      h += typeSettingsHTML(b);

      h += '<div class="qb-settings__checks">' +
        '<label class="checkbox-option__label"><input type="checkbox" id="set-req"' + (b.req ? ' checked' : '') + '> Required</label>' +
        '<label class="checkbox-option__label"><input type="checkbox" id="set-instr-on"' + (b.instrOn ? ' checked' : '') +
          ' aria-controls="set-instr-field"> Instructions</label>' +
      '</div>';
      h += '<div id="set-instr-field"' + (b.instrOn ? '' : ' hidden') + '>' +
        rteHTML('set-instr', 'Instructions', b.instr || '', 'Shown under the question.', INSTR_LIMIT) + '</div>';
    }

    settingsEl.innerHTML = h + '</div>';
    settingsEl.querySelectorAll('.rte').forEach(wireRte);
    settingsEl.querySelectorAll('[data-counter-for]').forEach(paintCounter);
  }

  /* Settings controls. Plain fields write straight to b[data-k]; the ones
     marked data-rerender change which other settings apply, so the panel
     redraws around them. */
  function selectHTML(id, label, map, value, k, rerender, hint) {
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      (hint ? '<span class="field-hint" id="' + id + '-hint">' + hint + '</span>' : '') +
      '<select id="' + id + '" data-k="' + k + '"' + (rerender ? ' data-rerender' : '') + (hint ? ' aria-describedby="' + id + '-hint"' : '') + '>' +
      Object.keys(map).map(function (v) {
        return '<option value="' + v + '"' + (String(v) === String(value) ? ' selected' : '') + '>' + map[v] + '</option>';
      }).join('') + '</select></div>';
  }

  function numberHTML(id, label, value, k, min, hint) {
    return '<div class="field"><label for="' + id + '">' + label + '</label>' +
      (hint ? '<span class="field-hint" id="' + id + '-hint">' + hint + '</span>' : '') +
      '<input type="number" id="' + id + '" data-k="' + k + '" min="' + min + '" value="' + (value == null ? '' : value) + '"' +
      (hint ? ' aria-describedby="' + id + '-hint"' : '') + '></div>';
  }

  function checkHTML(id, label, checked, k, rerender) {
    return '<div class="field"><label class="checkbox-option__label"><input type="checkbox" id="' + id + '" data-k="' + k + '"' +
      (rerender ? ' data-rerender' : '') + (checked ? ' checked' : '') + '> ' + label + '</label></div>';
  }

  function heading(text) {
    return '<h3 class="qb-settings__group">' + text + '</h3>';
  }

  /* An editable list of labels: choices, or a row-label table's rows */
  function listHTML(list, items, noun, label, minItems, fixed) {
    var lid = 'set-' + list + '-label';
    return '<div class="field"><span class="qb-q__label" id="' + lid + '">' + label + '</span>' +
      '<ul class="qb-opts" aria-labelledby="' + lid + '">' + items.map(function (o, k) {
        return '<li><input type="text" id="set-' + list + '-' + k + '" data-list="' + list + '" data-i="' + k + '" value="' + esc(o) +
          '" aria-label="' + noun + ' ' + (k + 1) + '">' +
          (fixed ? '' : '<button type="button" class="icon-btn" data-remove-item="' + list + '" data-i="' + k + '" aria-label="Remove ' +
            esc(o || noun.toLowerCase() + ' ' + (k + 1)) + '"' + (items.length <= minItems ? ' disabled' : '') + '>' +
            '<img src="assets/icon-delete.png" alt=""></button>') + '</li>';
      }).join('') + '</ul>' +
      (fixed ? '' : '<button type="button" class="btn btn--warm" data-add-item="' + list + '">Add ' + noun + '</button>') + '</div>';
  }

  /* Table headers: a name and a column format each */
  function colsHTML(cols, formats, label, minItems) {
    return '<div class="field"><span class="qb-q__label" id="set-cols-label">' + label + '</span>' +
      '<ul class="qb-cols" aria-labelledby="set-cols-label">' + cols.map(function (c, k) {
        var n = k + 1;
        return '<li class="qb-col">' +
          '<div class="qb-col__row"><input type="text" id="set-cols-' + k + '-name" data-list="cols" data-i="' + k + '" data-part="name"' +
            ' value="' + esc(c.name) + '" aria-label="Header ' + n + ' name">' +
          '<button type="button" class="icon-btn" data-remove-item="cols" data-i="' + k + '" aria-label="Remove ' + esc(c.name || 'header ' + n) + '"' +
            (cols.length <= minItems ? ' disabled' : '') + '><img src="assets/icon-delete.png" alt=""></button></div>' +
          '<select id="set-cols-' + k + '-fmt" data-list="cols" data-i="' + k + '" data-part="fmt" aria-label="Header ' + n + ' column format">' +
            Object.keys(formats).map(function (f) {
              return '<option value="' + f + '"' + (f === c.fmt ? ' selected' : '') + '>' + formats[f] + '</option>';
            }).join('') + '</select>' +
        '</li>';
      }).join('') + '</ul>' +
      '<button type="button" class="btn btn--warm" data-add-item="cols">Add Header</button></div>';
  }

  /* v2's Field Set Selections: Displayed and Required per field, with
     Required only available once the field is displayed */
  function fieldSetsHTML(b) {
    var fields = b.fields || {};
    return heading('Field set selections') +
      '<p class="field-hint" style="margin: 4px 0 0">Choose the fields each set repeats.</p>' +
      FIELD_SETS.map(function (s, si) {
        return '<table class="qb-fields"><caption>' + s[0] + '</caption><thead><tr>' +
          '<th scope="col">Field</th><th scope="col">Displayed</th><th scope="col">Required</th></tr></thead><tbody>' +
          s[1].map(function (f, fi) {
            var id = 'set-f-' + si + '-' + fi;
            var shown = !!fields[f];
            return '<tr><th scope="row">' + esc(f) + '</th>' +
              '<td><input type="checkbox" id="' + id + '-d" data-field="' + esc(f) + '" data-level="d"' + (shown ? ' checked' : '') +
                ' aria-label="Display ' + esc(f) + '"></td>' +
              '<td><input type="checkbox" id="' + id + '-r" data-field="' + esc(f) + '" data-level="r"' +
                (fields[f] === 'r' ? ' checked' : '') + (shown ? '' : ' disabled') + ' aria-label="Make ' + esc(f) + ' required"></td></tr>';
          }).join('') + '</tbody></table>';
      }).join('');
  }

  function typeSettingsHTML(b) {
    var t = b.type;
    var h = '';

    if (t === 'Free Form') {
      h += selectHTML('set-fmt', 'Format', { alphanumeric: 'Alpha/Numeric', numeric: 'Numeric' }, b.fmt, 'fmt', true);
      if (b.fmt === 'numeric') {
        h += selectHTML('set-num-fmt', 'Format options', NUM_FORMATS, b.numFmt || 'integer', 'numFmt', true);
        if (b.numFmt === 'decimal') h += numberHTML('set-places', 'Number of decimal places', b.places, 'places', 0);
        h += '<div class="field-grid field-grid--2">' + numberHTML('set-min-val', 'Min value', b.minVal, 'minVal', 0) +
          numberHTML('set-max-val', 'Max value', b.maxVal, 'maxVal', 0) + '</div>';
      } else {
        h += selectHTML('set-len', 'Response length', LENGTHS, b.len || 'medium', 'len', true);
        if (b.len === 'custom') {
          h += '<div class="field-grid field-grid--2">' + numberHTML('set-min-len', 'Min length', b.minLen, 'minLen', 0) +
            numberHTML('set-max-len', 'Max length', b.maxLen, 'maxLen', 1) + '</div>';
        }
      }
    }

    if (CHOICE_TYPES.indexOf(t) > -1) h += listHTML('opts', b.opts || [], 'Choice', 'Choices', 2);

    /* Always two: the pair can be relabelled (Either/Or) but not extended */
    if (t === 'Yes/No; Either/Or') h += listHTML('opts', b.opts || [], 'Choice', 'Choices', 2, true);

    if (t === 'Date / Date Range') h += checkHTML('set-range', 'Date range answer (start and end)', b.range, 'range');

    if (t === 'Table') {
      h += colsHTML(b.cols || [], COL_FORMATS, 'Headers', 1);
      h += numberHTML('set-req-rows', 'Number of required rows', b.reqRows, 'reqRows', 0);
    }

    if (t === 'Table (Row Labels)') {
      h += heading('Row label column');
      h += '<div class="field"><label for="set-row-head">Header 1</label>' +
        '<input type="text" id="set-row-head" data-k="rowHead" value="' + esc(b.rowHead) + '"></div>';
      h += checkHTML('set-agency-rows', 'Agency defined row labels', b.agencyRows, 'agencyRows', true);
      if (b.agencyRows) h += listHTML('rows', b.rows || [], 'Row', 'Row labels', 1);
      h += heading('Additional columns');
      h += colsHTML(b.cols || [], COL_FORMATS_RL, 'Headers', 1);
      h += heading('Rows and totals');
      h += numberHTML('set-req-rows', 'Number of required rows', b.reqRows, 'reqRows', 0);
      h += '<div class="field-grid field-grid--2">' +
        selectHTML('set-col-agg', 'Column aggregations', { none: 'None', sum: 'Sum' }, b.colAgg, 'colAgg') +
        selectHTML('set-row-agg', 'Row aggregations', { none: 'None', sum: 'Sum' }, b.rowAgg, 'rowAgg') + '</div>';
      h += checkHTML('set-grand', 'Grand total', b.grand, 'grand');
    }

    if (t === 'Addresses / Repeatable Fields') {
      h += selectHTML('set-min-sets', 'Minimum number of field sets', { 0: '0', 1: '1', 2: '2', 3: '3', 4: '4' }, b.min || 0, 'min', false,
        '0 makes the question optional.');
      h += fieldSetsHTML(b);
    }

    return h;
  }

  /* Rich text: the formatting commands that carry the demo are wired with
     execCommand; Link sits inert, as on the other builder steps */
  function wireRte(rte) {
    var body = rte.querySelector('.rte__body');
    rte.querySelectorAll('.rte__btn').forEach(function (btn) {
      /* mousedown, so the caret is not lost before the command runs */
      btn.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var cmd = btn.getAttribute('data-cmd');
        if (!cmd) return;
        body.focus();
        document.execCommand(cmd);
        body.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  function paintCounter(counter) {
    var body = document.getElementById(counter.getAttribute('data-counter-for'));
    var limit = parseInt(body.getAttribute('data-limit'), 10);
    var left = limit - body.textContent.length;
    counter.textContent = Math.abs(left) + ' character' + (Math.abs(left) === 1 ? '' : 's') + (left < 0 ? ' over' : ' left');
    counter.classList.toggle('char-counter--over', left < 0);
  }

  /* Live edits: written straight onto the selected block, then the canvas and
     outline redraw. The settings panel itself is left alone so focus and the
     caret stay put. */
  function liveEdit() {
    renderCanvas();
    renderOutline();
    renderPalette();
    document.getElementById('saved-note').textContent = 'saved just now';
  }

  /* Redraws the panel and puts focus back on the control that had it */
  function refreshSettings() {
    var id = document.activeElement && document.activeElement.id;
    renderSettings();
    var el = id && document.getElementById(id);
    if (el) el.focus();
  }

  settingsEl.addEventListener('input', function (e) {
    var b = find(state.sel);
    if (!b) return;
    var t = e.target;

    if (t.id === 'set-text') b.text = t.innerHTML;
    else if (t.id === 'set-instr') b.instr = t.innerHTML;
    else if (t.id === 'set-title') b.title = t.value;
    else if (t.hasAttribute('data-list') && t.tagName === 'INPUT') {
      var i = parseInt(t.getAttribute('data-i'), 10);
      var list = t.getAttribute('data-list');
      if (list === 'cols') b.cols[i].name = t.value;
      else b[list][i] = t.value;
    } else if (t.hasAttribute('data-k') && (t.type === 'text' || t.type === 'number')) {
      b[t.getAttribute('data-k')] = t.type === 'number' ? (t.value === '' ? null : parseInt(t.value, 10)) : t.value;
    } else return;

    var counter = settingsEl.querySelector('[data-counter-for="' + t.id + '"]');
    if (counter) paintCounter(counter);
    liveEdit();
  });

  settingsEl.addEventListener('change', function (e) {
    var b = find(state.sel);
    if (!b) return;
    var t = e.target;

    if (t.id === 'set-type') return changeType(t.value);

    if (t.id === 'set-req') b.req = t.checked;
    else if (t.id === 'set-instr-on') {
      b.instrOn = t.checked;
      document.getElementById('set-instr-field').hidden = !t.checked;
    } else if (t.hasAttribute('data-list') && t.tagName === 'SELECT') {
      b.cols[parseInt(t.getAttribute('data-i'), 10)].fmt = t.value;
    } else if (t.hasAttribute('data-field')) {
      var f = t.getAttribute('data-field');
      b.fields = b.fields || {};
      if (t.getAttribute('data-level') === 'd') {
        if (t.checked) b.fields[f] = 'd';
        else delete b.fields[f];
        var req = document.getElementById(t.id.replace(/-d$/, '-r'));
        req.disabled = !t.checked;
        if (!t.checked) req.checked = false;
      } else {
        b.fields[f] = t.checked ? 'r' : 'd';
      }
    } else if (t.hasAttribute('data-k') && (t.type === 'checkbox' || t.tagName === 'SELECT')) {
      var k = t.getAttribute('data-k');
      b[k] = t.type === 'checkbox' ? t.checked : (k === 'min' ? parseInt(t.value, 10) : t.value);
      if (k === 'fmt' && t.value === 'numeric' && !b.numFmt) b.numFmt = 'integer';
      if (t.hasAttribute('data-rerender')) refreshSettings();
    } else return;
    liveEdit();
  });

  settingsEl.addEventListener('click', function (e) {
    var b = find(state.sel);
    if (e.target.closest('#settings-close')) {
      var id = state.sel;
      select(null);
      var el = blockEl(id);
      if (el) el.focus();
      return;
    }
    if (!b) return;

    var add = e.target.closest('[data-add-item]');
    var remove = e.target.closest('[data-remove-item]');
    if (!add && !remove) return;

    var list = (add || remove).getAttribute(add ? 'data-add-item' : 'data-remove-item');
    var items = b[list];
    var focusIdx;
    if (add) {
      if (list === 'cols') items.push({ name: 'Header ' + (items.length + (b.type === 'Table' ? 1 : 2)), fmt: 'alphanumeric' });
      else items.push((list === 'rows' ? 'Row ' : 'Choice ') + (items.length + 1));
      focusIdx = items.length - 1;
    } else {
      var k = parseInt(remove.getAttribute('data-i'), 10);
      items.splice(k, 1);
      focusIdx = Math.min(k, items.length - 1);
    }
    renderSettings();
    liveEdit();
    var input = document.getElementById('set-' + list + '-' + focusIdx + (list === 'cols' ? '-name' : ''));
    if (input) {
      input.focus();
      if (add) input.select();
    }
  });

  /* Canvas interaction ------------------------------------------------------------ */

  function rove(btn) {
    btn.closest('.qb-tools').querySelectorAll('.qb-tools__btn').forEach(function (b) {
      b.tabIndex = b === btn ? 0 : -1;
    });
  }

  blocksEl.addEventListener('click', function (e) {
    if (state.mode !== 'build') return;

    var toolBtn = e.target.closest('[data-tool]');
    if (toolBtn) {
      var id = toolBtn.closest('[data-block]').getAttribute('data-block');
      var k = toolBtn.getAttribute('data-tool');
      if (k === 'up') step(id, -1, { tool: 'up', id: id });
      else if (k === 'down') step(id, 1, { tool: 'down', id: id });
      else if (k === 'move') openMove(id);
      else if (k === 'dup') dup(id);
      else if (k === 'del') del(id);
      return;
    }

    var addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      var at = parseInt(addBtn.getAttribute('data-add'), 10);
      if (state.menu && state.menu.at === at) closeMenu(true);
      else openMenu(at);
      return;
    }

    if (e.target.closest('.qb-menu')) return;

    var block = e.target.closest('[data-block]');
    if (block && block.getAttribute('data-block') !== state.sel) select(block.getAttribute('data-block'), true);
  });

  blocksEl.addEventListener('keydown', function (e) {
    if (state.mode !== 'build') return;

    /* Arrow keys inside the block toolbar */
    var toolBtn = e.target.closest('.qb-tools__btn');
    if (toolBtn && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) > -1) {
      e.preventDefault();
      var all = Array.prototype.slice.call(toolBtn.closest('.qb-tools').querySelectorAll('.qb-tools__btn'));
      var i = all.indexOf(toolBtn);
      var next = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1
        : (i + (e.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length;
      rove(all[next]);
      all[next].focus();
      return;
    }

    var block = e.target.closest('[data-block]');
    if (block && e.target === block && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      select(block.getAttribute('data-block'), true);
    }
  });

  /* Add here popover ----------------------------------------------------------------- */

  function menuItems() {
    var f = state.menu ? state.menu.filter.trim().toLowerCase() : '';
    var out = [];
    GROUPS.forEach(function (g) {
      g[1].forEach(function (t) { if (!f || t.toLowerCase().indexOf(f) > -1) out.push({ g: g[0], t: t }); });
    });
    return out;
  }

  var menuEl = document.createElement('div');
  menuEl.className = 'qb-menu';
  menuEl.id = 'add-menu';
  menuEl.innerHTML =
    '<p class="qb-menu__heading" id="menu-heading"></p>' +
    '<input type="text" class="qb-menu__filter" id="menu-filter" role="combobox" aria-expanded="true"' +
      ' aria-controls="menu-list" aria-autocomplete="list" aria-label="Filter question types"' +
      ' aria-describedby="menu-heading menu-hint" placeholder="Type to filter" autocomplete="off">' +
    '<ul class="qb-menu__list" id="menu-list" role="listbox" aria-label="Question types"></ul>' +
    '<p class="qb-menu__hint" id="menu-hint">&uarr; &darr; choose &middot; Enter add &middot; Esc close</p>';
  var menuFilter = menuEl.querySelector('#menu-filter');
  var menuList = menuEl.querySelector('#menu-list');

  function mountMenu() {
    var row = blocksEl.querySelector('[data-add-row="' + state.menu.at + '"]');
    if (!row) return;
    row.appendChild(menuEl);
    var prev = state.blocks[state.menu.at];
    document.getElementById('menu-heading').textContent = prev ? 'Add after ' + name(prev, nums(state.blocks)) : 'Add at the top of the form';
    menuFilter.value = state.menu.filter;
    renderMenuList();
  }

  function renderMenuList() {
    var items = menuItems();
    var lastG = null;
    var h = '';
    items.forEach(function (m, k) {
      if (m.g !== lastG) {
        h += '<li class="qb-menu__group" role="presentation">' + m.g + '</li>';
        lastG = m.g;
      }
      var on = k === state.menu.idx;
      h += '<li class="qb-menu__option' + (on ? ' is-active' : '') + '" role="option" id="qbm-' + k + '" data-pick="' + k + '"' +
        ' aria-selected="' + on + '"><i class="' + ICONS[m.t] + '" aria-hidden="true"></i>' + m.t + '</li>';
    });
    if (!items.length) h = '<li class="qb-menu__none" role="presentation">No types match.</li>';
    menuList.innerHTML = h;

    if (items.length) menuFilter.setAttribute('aria-activedescendant', 'qbm-' + state.menu.idx);
    else menuFilter.removeAttribute('aria-activedescendant');

    var active = menuList.querySelector('.is-active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  function openMenu(at) {
    state.menu = { at: at, filter: '', idx: 0 };
    closeShortcuts(false);
    renderCanvas();
    menuFilter.focus();
  }

  function closeMenu(refocus) {
    if (!state.menu) return;
    var at = state.menu.at;
    state.menu = null;
    if (menuEl.parentNode) menuEl.parentNode.removeChild(menuEl);
    var btn = blocksEl.querySelector('[data-add="' + at + '"]');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.removeAttribute('aria-controls');
      btn.parentNode.classList.remove('is-open');
      if (refocus) btn.focus();
    }
  }

  menuFilter.addEventListener('input', function () {
    state.menu.filter = menuFilter.value;
    state.menu.idx = 0;
    renderMenuList();
  });

  menuFilter.addEventListener('keydown', function (e) {
    var items = menuItems();
    var n = items.length;
    var m = state.menu;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (n) { m.idx = (m.idx + 1) % n; renderMenuList(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) { m.idx = (m.idx - 1 + n) % n; renderMenuList(); } }
    else if (e.key === 'Home') { e.preventDefault(); m.idx = 0; renderMenuList(); }
    else if (e.key === 'End') { e.preventDefault(); m.idx = Math.max(0, n - 1); renderMenuList(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[m.idx]) insert(m.at + 1, items[m.idx].t); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(true); }
    else if (e.key === 'Tab') { closeMenu(false); }
  });

  /* mousedown, so the filter keeps focus until the click lands */
  menuList.addEventListener('mousedown', function (e) { e.preventDefault(); });
  menuList.addEventListener('click', function (e) {
    var opt = e.target.closest('[data-pick]');
    if (!opt) return;
    var item = menuItems()[parseInt(opt.getAttribute('data-pick'), 10)];
    if (item) insert(state.menu.at + 1, item.t);
  });
  menuList.addEventListener('mousemove', function (e) {
    var opt = e.target.closest('[data-pick]');
    if (!opt) return;
    var k = parseInt(opt.getAttribute('data-pick'), 10);
    if (k !== state.menu.idx) { state.menu.idx = k; renderMenuList(); }
  });

  /* Clicking anywhere else closes the popover and the shortcuts list */
  document.addEventListener('mousedown', function (e) {
    if (state.menu && !e.target.closest('.qb-menu') && !e.target.closest('[data-add]')) closeMenu(false);
    if (!shortcuts.hidden && !e.target.closest('.qb-shortcuts-wrap')) closeShortcuts(false);
  });

  /* Left panel ------------------------------------------------------------------------ */

  paletteEl.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-type]');
    if (btn) addAfterSel(btn.dataset.type);
  });

  outlineEl.addEventListener('click', function (e) {
    var row = e.target.closest('[data-outline]');
    if (!row) return;
    var id = row.getAttribute('data-outline');
    select(id);
    var again = outlineEl.querySelector('[data-outline="' + id + '"]');
    if (again) again.focus();
  });

  var tabs = [document.getElementById('tab-add'), document.getElementById('tab-outline')];

  function showTab(which, focus) {
    state.left = which;
    tabs.forEach(function (t) {
      var on = t.id === 'tab-' + which;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) t.focus();
    });
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { showTab(t.id.replace('tab-', ''), false); });
    t.addEventListener('keydown', function (e) {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) < 0) return;
      e.preventDefault();
      showTab(state.left === 'add' ? 'outline' : 'add', true);
    });
  });

  /* Drag and drop: a shortcut for the click paths, never a replacement ------------------- */

  paletteEl.addEventListener('dragstart', function (e) {
    var btn = e.target.closest('[data-type]');
    if (!btn) return;
    drag = { kind: 'new', type: btn.dataset.type };
    e.dataTransfer.setData('text/plain', btn.dataset.type);
    e.dataTransfer.effectAllowed = 'copyMove';
  });

  blocksEl.addEventListener('dragstart', function (e) {
    var block = e.target.closest && e.target.closest('[data-block]');
    if (!block || state.mode !== 'build') return;
    drag = { kind: 'move', id: block.getAttribute('data-block') };
    e.dataTransfer.setData('text/plain', drag.id);
    e.dataTransfer.effectAllowed = 'move';
    closeMenu(false);
    setTimeout(function () { block.classList.add('is-dragging'); }, 0);
  });

  function clearDrop() {
    blocksEl.querySelectorAll('.qb-add.is-drop').forEach(function (row) {
      row.classList.remove('is-drop');
      row.querySelector('[data-add-text]').textContent = 'Add here';
    });
  }

  blocksEl.addEventListener('dragover', function (e) {
    var row = e.target.closest('[data-add-row]');
    if (!row || !drag) return;
    e.preventDefault();
    if (!row.classList.contains('is-drop')) {
      clearDrop();
      row.classList.add('is-drop');
      row.querySelector('[data-add-text]').textContent = 'Drop here';
    }
  });

  blocksEl.addEventListener('dragleave', function (e) {
    var row = e.target.closest('[data-add-row]');
    if (row && !row.contains(e.relatedTarget)) {
      row.classList.remove('is-drop');
      row.querySelector('[data-add-text]').textContent = 'Add here';
    }
  });

  blocksEl.addEventListener('drop', function (e) {
    var row = e.target.closest('[data-add-row]');
    if (!row || !drag) return;
    e.preventDefault();
    var d = drag;
    drag = null;
    var at = parseInt(row.getAttribute('data-add-row'), 10);
    if (d.kind === 'new') insert(at + 1, d.type);
    else moveAfter(d.id, at);
  });

  document.addEventListener('dragend', function () {
    drag = null;
    clearDrop();
    blocksEl.querySelectorAll('.is-dragging').forEach(function (el) { el.classList.remove('is-dragging'); });
  });

  /* Move to dialog ------------------------------------------------------------------------ */

  var modal = document.getElementById('move-modal');
  var moveOptions = document.getElementById('move-options');
  var moveConfirm = document.getElementById('move-confirm');

  /* Candidate list with the moving block taken out and put back at k */
  function moveCandidate(red, b, k) {
    return red.slice(0, k).concat([b], red.slice(k));
  }

  function openMove(id) {
    closeMenu(false);
    var bl = state.blocks;
    var i = indexOf(bl, id);
    var b = bl[i];
    var nm = nums(bl);
    var red = bl.filter(function (_, x) { return x !== i; });
    state.move = { id: id, from: i, to: i };

    document.getElementById('move-eyebrow').textContent = b.kind === 'q' ? 'Move Question ' + nm[b.id] : 'Move description';
    document.getElementById('move-title').textContent = trunc(plain(b.text), 60);

    var h = '';
    for (var k = 0; k <= red.length; k++) {
      var prev = red[k - 1];
      if (k === 0 && red[0] && red[0].kind === 'section') continue;
      if (prev && prev.kind === 'section') h += '<p class="qb-move__group">' + esc(prev.title) + '</p>';
      var ok = valid(moveCandidate(red, b, k));
      var cur = k === i;
      var label = !prev ? 'At the top of the form'
        : prev.kind === 'section' ? 'At the top of this section'
        : 'After ' + (prev.kind === 'q' ? nm[prev.id] + ' · ' + trunc(plain(prev.text)) : 'Description: ' + trunc(plain(prev.text)));
      var reason = ok ? '' : b.cond
        ? 'Must stay below Question ' + nm[b.cond.on] + ', which it depends on.'
        : 'A follow-up question that depends on this one would end up above it.';
      h += '<label class="qb-move__option' + (cur ? ' is-selected' : '') + (ok ? '' : ' is-disabled') + '">' +
        '<input type="radio" name="move-to" value="' + k + '"' + (cur ? ' checked' : '') + (ok ? '' : ' disabled') + '>' +
        '<span>' + esc(label) + (cur ? '<span class="tag tag--muted">Current</span>' : '') +
          (reason ? '<span class="qb-move__reason">' + esc(reason) + '</span>' : '') + '</span>' +
      '</label>';
    }
    moveOptions.innerHTML = h;
    moveConfirm.disabled = true;
    modal.hidden = false;

    var checked = moveOptions.querySelector('input:checked') || moveOptions.querySelector('input:not([disabled])');
    if (checked) checked.focus();
  }

  function closeMove() {
    if (!state.move) return;
    var id = state.move.id;
    state.move = null;
    modal.hidden = true;
    var el = blockEl(id);
    if (el) el.focus({ preventScroll: true });
  }

  moveOptions.addEventListener('change', function (e) {
    if (e.target.name !== 'move-to') return;
    state.move.to = parseInt(e.target.value, 10);
    moveOptions.querySelectorAll('.qb-move__option').forEach(function (l) {
      l.classList.toggle('is-selected', l.querySelector('input').checked);
    });
    moveConfirm.disabled = state.move.to === state.move.from;
  });

  moveConfirm.addEventListener('click', function () {
    var m = state.move;
    var bl = state.blocks;
    var b = bl[m.from];
    var red = bl.filter(function (_, x) { return x !== m.from; });
    var out = moveCandidate(red, b, m.to);
    if (!valid(out)) return;
    var nm = nums(bl);
    var n2 = nums(out);
    state.move = null;
    modal.hidden = true;
    commit(out, { sel: b.id, focus: { block: b.id } },
      b.kind === 'q' ? name(b, nm) + ' moved, now Question ' + n2[b.id] + '.' : 'Description moved.');
  });

  document.getElementById('move-cancel').addEventListener('click', closeMove);
  document.getElementById('move-close').addEventListener('click', closeMove);
  modal.addEventListener('mousedown', function (e) { if (e.target === modal) closeMove(); });

  /* Esc closes; Tab stays inside the dialog */
  modal.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeMove(); return; }
    if (e.key !== 'Tab') return;
    var f = Array.prototype.slice.call(modal.querySelectorAll('button:not([disabled]), input:not([disabled])'))
      .filter(function (el) { return el.type !== 'radio' || el.checked || !modal.querySelector('input[name="move-to"]:checked'); });
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* Toolbar: undo, shortcuts, mode ----------------------------------------------------------- */

  undoBtn.addEventListener('click', undo);

  var shortcutsBtn = document.getElementById('shortcuts-btn');
  var shortcuts = document.getElementById('shortcuts');

  function closeShortcuts(refocus) {
    if (shortcuts.hidden) return;
    shortcuts.hidden = true;
    shortcutsBtn.setAttribute('aria-expanded', 'false');
    if (refocus) shortcutsBtn.focus();
  }

  shortcutsBtn.addEventListener('click', function () {
    var open = shortcuts.hidden;
    shortcuts.hidden = !open;
    shortcutsBtn.setAttribute('aria-expanded', String(open));
  });

  var modeBuild = document.getElementById('mode-build');
  var modePreview = document.getElementById('mode-preview');

  function setMode(mode) {
    state.mode = mode;
    var build = mode === 'build';
    closeMenu(false);
    closeShortcuts(false);
    qb.classList.toggle('is-preview', !build);
    modeBuild.classList.toggle('is-active', build);
    modePreview.classList.toggle('is-active', !build);
    modeBuild.setAttribute('aria-pressed', String(build));
    modePreview.setAttribute('aria-pressed', String(!build));
    document.getElementById('preview-note').hidden = build;
    document.getElementById('canvas-eyebrow').innerHTML = build ? 'Build &middot; Question Builder' : 'Preview &middot; Applicant view';
    undoBtn.hidden = !build;
    renderAll(true);
  }

  modeBuild.addEventListener('click', function () { setMode('build'); });
  modePreview.addEventListener('click', function () { setMode('preview'); });

  /* Page-wide keys ---------------------------------------------------------------------------- */

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !shortcuts.hidden) { closeShortcuts(true); return; }
    if (state.mode !== 'build' || state.move) return;
    var typing = isTyping(e.target);

    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && state.sel && !typing) {
      e.preventDefault();
      step(state.sel, e.key === 'ArrowUp' ? -1 : 1, { block: state.sel });
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !typing) {
      e.preventDefault();
      undo();
    }
  });

  renderAll(true);
}
