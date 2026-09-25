/**
 * Conditions (Build phase, step 2).
 *
 * One row per Yes/No; Either/Or question, since those are the only triggers.
 * A row opens into a plain-language rule: choose an answer, then check what
 * that answer shows. There is no Hide: every trigger is required, so "hide X
 * when Owned" is the same form as "show X when Leased", and v2's hide rules
 * can be carried over that way.
 *
 * The checklist enforces the two rules the form depends on, so it never has
 * to warn about them afterwards:
 *   - a trigger can only reveal items below it, which also rules out loops
 *   - an item has one condition at most (its cond), so items another answer
 *     already reveals are shown but disabled, with the owner named
 *
 * Documents from Document Upload are not targets: the application collects
 * them in a later step of its own.
 *
 * Edits collect in a draft per row until Save Rule or Cancel. Opening another
 * row keeps the draft and marks the collapsed row as unsaved.
 *
 * Markup contract: builder-conditions.html. Data: js/builder-form.js.
 */
function initConditions() {

  var TRIGGER_TYPE = 'Yes/No; Either/Or';
  var TOAST_MS = 5000;

  var state = {
    blocks: JSON.parse(JSON.stringify(BUILDER_FORM)),
    open: null,   /* trigger id of the expanded row */
    drafts: {}    /* trigger id -> { answer, map: { block id: answer } } */
  };

  var listEl = document.getElementById('cond-list');
  var countEl = document.getElementById('cond-count');
  var toastEl = document.getElementById('toast');
  var toastText = document.getElementById('toast-text');
  var toastTimer = null;

  /* Helpers ---------------------------------------------------------------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function trunc(s, n) {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function find(id) {
    for (var i = 0; i < state.blocks.length; i++) if (state.blocks[i].id === id) return state.blocks[i];
    return null;
  }

  /* Questions are numbered as Question Builder numbers them */
  var nm = {};
  (function () {
    var n = 0;
    state.blocks.forEach(function (b) { if (b.kind === 'q') nm[b.id] = ++n; });
  })();

  /* Every block but a section can be revealed */
  function allKeys() {
    return state.blocks.filter(function (b) { return b.kind !== 'section'; })
      .map(function (b) { return b.id; });
  }

  function shortName(id) {
    var b = find(id);
    return b.kind === 'desc' ? 'a description' : 'Question ' + nm[id];
  }

  function list(names) {
    if (names.length < 2) return names.join('');
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  }

  function triggers() {
    return state.blocks.filter(function (b) { return b.kind === 'q' && b.type === TRIGGER_TYPE; });
  }

  /* The saved rule for a trigger, as { item key: answer } */
  function saved(tid) {
    var m = {};
    allKeys().forEach(function (k) {
      var c = find(k).cond;
      if (c && c.on === tid) m[k] = c.val;
    });
    return m;
  }

  function current(tid) {
    return state.drafts[tid] ? state.drafts[tid].map : saved(tid);
  }

  function same(a, b) {
    var ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(function (k) { return a[k] === b[k]; });
  }

  function dirty(tid) {
    return !!state.drafts[tid] && !same(state.drafts[tid].map, saved(tid));
  }

  function keysFor(map, answer) {
    return allKeys().filter(function (k) { return map[k] === answer; });
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* Rendering -------------------------------------------------------------- */

  function render() {
    var ts = triggers();
    var withRules = ts.filter(function (t) { return Object.keys(saved(t.id)).length; }).length;
    countEl.textContent = plural(ts.length, 'question can', 'questions can') + ' reveal content · ' +
      withRules + ' ' + (withRules === 1 ? 'has' : 'have') + ' conditions';

    if (!ts.length) {
      listEl.innerHTML = '';
      countEl.textContent = 'This form has no Yes/No; Either/Or questions yet. Add one in Question Builder to set up a condition.';
      return;
    }
    listEl.innerHTML = ts.map(rowHTML).join('');
  }

  function rowHTML(t) {
    var open = state.open === t.id;
    var map = current(t.id);
    var any = Object.keys(saved(t.id)).length > 0;
    var edId = 'cond-editor-' + t.id;

    var h = '<li class="question-card cond-row' + (any ? ' is-answered' : '') + (open ? ' is-open' : '') + '" data-trigger="' + t.id + '">' +
      '<span class="question-card__num">' + nm[t.id] + '</span>' +
      '<div class="question-card__body">' +
        '<h2 class="question-card__title">' +
          '<button type="button" class="cond-row__toggle" data-act="toggle" aria-expanded="' + open + '" aria-controls="' + edId + '">' +
            '<span>' + esc(t.text) + '</span>' +
            '<i class="fa-solid fa-chevron-' + (open ? 'up' : 'down') + '" aria-hidden="true"></i>' +
          '</button>' +
        '</h2>' +
        '<p class="cond-row__summary">' + summaryHTML(t, saved(t.id)) + '</p>' +
        (dirty(t.id) && !open ? '<p class="cond-row__unsaved"><i class="fa-solid fa-pen" aria-hidden="true"></i>Unsaved changes. Open to save or cancel them.</p>' : '');

    if (open) h += editorHTML(t, map, edId);
    return h + '</div></li>';
  }

  /* "Owned: no conditions · Leased: shows Question 4 and Question 5" */
  function summaryHTML(t, map) {
    if (!Object.keys(map).length) return 'No conditions';
    return t.opts.map(function (o) {
      var ks = keysFor(map, o);
      return '<span class="cond-row__answer"><strong>' + esc(o) + ':</strong> ' +
        (ks.length ? 'shows ' + esc(list(ks.map(shortName))) : 'no conditions') + '</span>';
    }).join('<span class="cond-row__sep" aria-hidden="true">&middot;</span>');
  }

  function editorHTML(t, map, edId) {
    var answer = state.drafts[t.id].answer;
    var name = 'cond-answer-' + t.id;

    var h = '<div class="cond-editor" id="' + edId + '">';

    h += '<fieldset class="fieldset"><legend>When the answer is</legend><div class="choice-group">' +
      t.opts.map(function (o) {
        var n = keysFor(map, o).length;
        var sel = o === answer;
        return '<label class="choice' + (sel ? ' is-selected' : '') + '">' +
          '<input type="radio" name="' + name + '" value="' + esc(o) + '" data-act="answer"' + (sel ? ' checked' : '') + '>' +
          esc(o) + (n ? '<span class="cond-choice__count">' + plural(n, 'item', 'items') + '</span>' : '') +
        '</label>';
      }).join('') +
    '</div></fieldset>';

    h += '<fieldset class="fieldset cond-targets"><legend>Show</legend>' + targetsHTML(t, map, answer) + '</fieldset>';

    var ks = keysFor(map, answer);
    h += '<p class="cond-sentence" aria-live="polite"><i class="fa-solid fa-code-branch" aria-hidden="true"></i><span>When ' +
      '&ldquo;' + esc(t.text) + '&rdquo; is answered <strong>' + esc(answer) + '</strong>, ' +
      (ks.length ? 'show ' + esc(list(ks.map(shortName))) + '.' : 'nothing extra is shown.') + '</span></p>';

    h += '<div class="form-actions">' +
      '<button type="button" class="btn btn--primary" data-act="save"' + (dirty(t.id) ? '' : ' disabled') + '>Save Rule</button>' +
      '<button type="button" class="btn btn--cancel" data-act="cancel">Cancel</button>' +
    '</div>';

    return h + '</div>';
  }

  /* Everything after the trigger, under the section headings it sits in.
     Sections themselves are not targets. */
  function targetsHTML(t, map, answer) {
    var bl = state.blocks;
    var at = bl.indexOf(t);
    var sec = null;
    for (var k = at; k >= 0; k--) if (bl[k].kind === 'section') { sec = bl[k]; break; }

    var groups = [], cur = { title: sec ? sec.title : 'Before the first section', rows: [] };
    bl.slice(at + 1).forEach(function (b) {
      if (b.kind === 'section') {
        groups.push(cur);
        cur = { title: b.title, rows: [] };
      } else {
        cur.rows.push(b.id);
      }
    });
    groups.push(cur);

    var h = '';
    groups.forEach(function (g) {
      if (!g.rows.length) return;
      h += '<div class="cond-group"><p class="cond-group__title">Section: ' + esc(g.title) + '</p>' +
        g.rows.map(function (k) { return itemHTML(t, map, answer, k); }).join('') + '</div>';
    });
    return h || '<p class="help-text">Nothing comes after this question yet. Add questions below it in Question Builder.</p>';
  }

  function itemHTML(t, map, answer, key) {
    var it = find(key);
    var checked = map[key] === answer;
    var note = '';

    if (!checked && map[key] !== undefined) {
      note = 'Already shown when the answer is ' + map[key];
    } else if (!checked && it.cond && it.cond.on !== t.id) {
      note = 'Already shown by Question ' + nm[it.cond.on] + ' when the answer is ' + it.cond.val;
    }

    var num, text, type;
    if (it.kind === 'desc') {
      num = '<i class="fa-solid fa-paragraph" aria-hidden="true"></i>';
      text = it.text;
      type = 'Description';
    } else {
      num = 'Q' + nm[it.id];
      text = it.text;
      type = it.type;
    }

    var id = 'cond-item-' + t.id + '-' + key;
    return '<label class="checkbox-option__label cond-item' + (note ? ' is-disabled' : '') + '" for="' + id + '">' +
      '<input type="checkbox" id="' + id + '" data-act="item" data-key="' + key + '"' +
        (checked ? ' checked' : '') + (note ? ' disabled aria-describedby="' + id + '-note"' : '') + '>' +
      '<span class="cond-item__num">' + num + '</span>' +
      '<span class="cond-item__main">' +
        '<span class="cond-item__text">' + esc(trunc(text, 110)) + '</span>' +
        (note ? '<span class="cond-item__note" id="' + id + '-note"><i class="fa-solid fa-lock" aria-hidden="true"></i>' + esc(note) + '</span>' : '') +
      '</span>' +
      '<span class="tag tag--muted cond-item__type">' + esc(type) + '</span>' +
    '</label>';
  }

  /* Actions ---------------------------------------------------------------- */

  function toast(msg) {
    toastText.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, TOAST_MS);
  }

  /* Re-rendering replaces the row, so focus goes back to the same control */
  function refocus(tid, selector) {
    var row = listEl.querySelector('[data-trigger="' + tid + '"]');
    var el = row && row.querySelector(selector);
    if (el) el.focus();
  }

  function toggle(t) {
    if (state.open === t.id) {
      state.open = null;
    } else {
      state.open = t.id;
      if (!state.drafts[t.id]) {
        var map = saved(t.id);
        /* Open on the answer that already does something, if either does */
        var answer = t.opts.filter(function (o) { return keysFor(map, o).length; })[0] || t.opts[0];
        state.drafts[t.id] = { answer: answer, map: map };
      }
    }
    render();
    refocus(t.id, '[data-act="toggle"]');
  }

  function save(t) {
    var map = state.drafts[t.id].map;
    allKeys().forEach(function (k) {
      var it = find(k);
      if (map[k] !== undefined) it.cond = { on: t.id, val: map[k] };
      else if (it.cond && it.cond.on === t.id) delete it.cond;
    });
    delete state.drafts[t.id];
    state.open = null;
    render();
    refocus(t.id, '[data-act="toggle"]');
    var n = Object.keys(map).length;
    toast('Rule saved for Question ' + nm[t.id] + (n ? ': it reveals ' + plural(n, 'item', 'items') + '.' : ': it reveals nothing.'));
  }

  function cancel(t) {
    delete state.drafts[t.id];
    state.open = null;
    render();
    refocus(t.id, '[data-act="toggle"]');
  }

  listEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var t = find(btn.closest('[data-trigger]').getAttribute('data-trigger'));
    var act = btn.getAttribute('data-act');
    if (act === 'toggle') toggle(t);
    else if (act === 'save') save(t);
    else if (act === 'cancel') cancel(t);
  });

  listEl.addEventListener('change', function (e) {
    var el = e.target;
    var t = find(el.closest('[data-trigger]').getAttribute('data-trigger'));
    var d = state.drafts[t.id];
    var act = el.getAttribute('data-act');

    if (act === 'answer') {
      d.answer = el.value;
      render();
      refocus(t.id, 'input[data-act="answer"][value="' + el.value.replace(/"/g, '\\"') + '"]');
    } else if (act === 'item') {
      var key = el.getAttribute('data-key');
      if (el.checked) d.map[key] = d.answer;
      else delete d.map[key];
      render();
      refocus(t.id, 'input[data-key="' + key + '"]');
    }
  });

  render();
}
