/**
 * Combobox — a single-select dropdown you can type to filter.
 *
 * Use this instead of a <select> once a list runs past roughly ten options.
 * For short lists a plain <select class="..."> is still the right control.
 *
 * Markup contract (sits inside a .field, so it inherits the label, the
 * Required marker, the error message and the .field--error red border):
 *
 *   <div class="field" id="owner-app-field">
 *     <label for="owner-app-input">Owner Application <span class="field-required">Required</span></label>
 *     <span class="field-error" id="owner-app-error" hidden>Select an owner application.</span>
 *     <div class="combobox" id="owner-app">
 *       <input type="text" class="combobox__input" id="owner-app-input"
 *              placeholder="Please Select" autocomplete="off"
 *              role="combobox" aria-expanded="false" aria-autocomplete="list"
 *              aria-controls="owner-app-list">
 *       <input type="hidden" id="owner-app-value">
 *       <button type="button" class="combobox__toggle" tabindex="-1" aria-hidden="true">
 *         <i class="fa-solid fa-chevron-down"></i>
 *       </button>
 *       <ul class="combobox__list" id="owner-app-list" role="listbox" hidden></ul>
 *     </div>
 *   </div>
 *
 * Usage:
 *   var owner = initCombobox('#owner-app', {
 *     options: function () { return appsFor(licenseType.value); },  // or a plain array
 *     onSelect: function (option) { ... }
 *   });
 *
 * Returns a handle:
 *   getValue()            current value ('' when nothing is chosen)
 *   setValue(v)           select by value, or '' to clear
 *   setDisabled(bool)     disable/enable the input (also clears on disable)
 *   refresh()             re-read options and clear the selection — call this
 *                         when the field this one depends on changes
 *
 * Keyboard: Down/Up move through matches, Enter picks the highlighted one,
 * Escape closes without changing the selection.
 */
function initCombobox(root, opts) {
  var el = (typeof root === 'string') ? document.querySelector(root) : root;
  if (!el) return null;

  opts = opts || {};

  var input = el.querySelector('.combobox__input');
  var hidden = el.querySelector('input[type="hidden"]');
  var toggle = el.querySelector('.combobox__toggle');
  var list = el.querySelector('.combobox__list');

  var activeIndex = -1;
  var matches = [];

  function getOptions() {
    var source = opts.options;
    var resolved = (typeof source === 'function') ? source() : source;
    return resolved || [];
  }

  function labelFor(value) {
    var found = getOptions().filter(function (o) { return o.value === value; })[0];
    return found ? found.label : '';
  }

  function isOpen() {
    return !list.hidden;
  }

  function renderList(query) {
    var options = getOptions();
    var q = (query || '').toLowerCase().trim();

    /* A query that still matches the current selection shows the whole list,
       so re-opening a filled field doesn't look filtered down to one row. */
    matches = (q && q !== labelFor(hidden.value).toLowerCase())
      ? options.filter(function (o) { return o.label.toLowerCase().indexOf(q) !== -1; })
      : options;

    list.innerHTML = '';

    if (matches.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'combobox__option combobox__option--empty';
      empty.textContent = options.length === 0 ? 'No options available' : 'No matching options';
      list.appendChild(empty);
    } else {
      matches.forEach(function (option, idx) {
        var li = document.createElement('li');
        li.className = 'combobox__option';
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(option.value === hidden.value));
        li.textContent = option.label;
        if (idx === activeIndex) li.classList.add('is-active');

        /* mousedown, not click — blur would close the list first */
        li.addEventListener('mousedown', function (e) {
          e.preventDefault();
          select(option);
        });

        list.appendChild(li);
      });
    }
  }

  function open() {
    if (input.disabled) return;
    activeIndex = matches.length ? activeIndex : -1;
    renderList(input.value);
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
  }

  function select(option) {
    hidden.value = option.value;
    input.value = option.label;
    close();

    /* Clear the red border the wrapping .field may be carrying */
    var field = el.closest('.field');
    if (field) field.classList.remove('field--error');

    if (opts.onSelect) opts.onSelect(option);
  }

  function setActive(idx) {
    activeIndex = idx;
    var rows = list.querySelectorAll('.combobox__option');
    rows.forEach(function (row, i) {
      row.classList.toggle('is-active', i === activeIndex);
    });
    if (rows[activeIndex]) rows[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', function () {
    hidden.value = '';
    activeIndex = -1;
    open();
  });

  input.addEventListener('focus', function () {
    open();
  });

  input.addEventListener('blur', function () {
    /* Let a mousedown on an option land before the list goes away */
    setTimeout(function () {
      close();
      /* Half-typed text that never became a selection is discarded, so the
         field always reads back exactly what is stored. */
      input.value = hidden.value ? labelFor(hidden.value) : '';
    }, 150);
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen()) {
        open();
        setActive(0);
        return;
      }
      if (!matches.length) return;
      var next = e.key === 'ArrowDown' ? activeIndex + 1 : activeIndex - 1;
      if (next < 0) next = matches.length - 1;
      if (next >= matches.length) next = 0;
      setActive(next);
      return;
    }

    if (e.key === 'Enter') {
      if (isOpen() && activeIndex >= 0 && matches[activeIndex]) {
        e.preventDefault();
        select(matches[activeIndex]);
      }
      return;
    }

    if (e.key === 'Escape') {
      if (isOpen()) {
        e.stopPropagation();
        close();
        input.value = hidden.value ? labelFor(hidden.value) : '';
      }
    }
  });

  toggle.addEventListener('mousedown', function (e) {
    e.preventDefault();
    if (input.disabled) return;
    if (isOpen()) {
      close();
    } else {
      input.focus();
      open();
    }
  });

  return {
    getValue: function () {
      return hidden.value;
    },

    setValue: function (value) {
      hidden.value = value || '';
      input.value = value ? labelFor(value) : '';
    },

    setDisabled: function (disabled) {
      input.disabled = !!disabled;
      toggle.disabled = !!disabled;
      if (disabled) {
        hidden.value = '';
        input.value = '';
        close();
      }
    },

    refresh: function () {
      hidden.value = '';
      input.value = '';
      close();
    }
  };
}
