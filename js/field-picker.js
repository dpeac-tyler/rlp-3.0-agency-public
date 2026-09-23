/**
 * Field picker + live preview — the four Applicant Information steps.
 *
 * The agency ticks which fields the applicant will be asked for; the panel
 * beside the table renders exactly those fields in the applicant's own visual
 * language, so the effect of a tick is visible without leaving the step.
 *
 * The preview is rebuilt from the table on every change, in table order, so it
 * can never drift from what was actually ticked.
 *
 * Row contract — <tr> in #picker-body:
 *   data-label="Email Address"          label shown in the preview (required)
 *   data-control="select"               preview it as a dropdown, not a text box
 *   data-lock-displayed                 Displayed is fixed; renders the lock marker
 *   data-lock-required                  Required is fixed, so leave it alone
 *   data-preview-fields='[{...}]'       JSON: this row becomes more than one
 *                                       field in the applicant's form. Each
 *                                       part takes {label, control, placeholder,
 *                                       note} and inherits the row's Required
 *                                       state. Used by Email Address, which
 *                                       brings a confirm field, and by
 *                                       Height/Weight, which is two controls.
 *   data-preview-label="State"          shorter label the applicant sees, where
 *                                       it differs from the admin title
 *   data-options="race"                 this field's dropdown options are
 *                                       curated too; pairs with the row below
 *
 * Option rows — a <tr class="picker-options-row" data-options-for="race">
 * immediately after its parent, holding a .picker-options__toggle disclosure
 * and a .picker-options panel of [data-option] checkboxes. Options carry no
 * Required column, and the row hides itself while the parent is not displayed.
 *
 * Invariant: a displayed dropdown always has at least one option, because an
 * empty list is never a configuration anyone wants. It is held from both ends,
 * which is the only way the rule does not become a trap:
 *   untick the last option  -> the field switches off with it
 *   switch the field back on -> its options all come back
 * Without the second half, a field emptied once could never be turned on
 * again: it would switch itself straight back off. Both directions are
 * announced, since each one changes a control the user did not click.
 *
 * Each row holds one [data-displayed] and one [data-required] checkbox.
 *
 * Optional block toggles — #picker-blocks holds [data-block] rows, each with a
 * data-block-label and a single [data-displayed] checkbox and no Required.
 * A block is a whole repeat of the field set under its own heading (Mailing
 * Address's Physical and Alternate Address), so ticking one adds a second copy
 * of the same fields to the preview. #picker-body then needs a
 * data-group-label naming the primary group.
 *
 * Page contract: #picker-body, #preview-fields, #preview-empty, #picker-count.
 */
function initFieldPicker() {
  var pickerBody = document.getElementById('picker-body');
  var previewFields = document.getElementById('preview-fields');
  var previewEmpty = document.getElementById('preview-empty');
  var pickerCount = document.getElementById('picker-count');
  var pickerBlocks = document.getElementById('picker-blocks');
  if (!pickerBody) return;

  /* Required only means something for a field the applicant can see, so it
     stays locked until Displayed is ticked and clears when it is unticked.
     Rows whose Required is fixed by the product opt out of that entirely. */
  function syncRow(row) {
    if (row.hasAttribute('data-lock-required')) return;

    var displayed = row.querySelector('[data-displayed]');
    var required = row.querySelector('[data-required]');
    if (!required) return;          /* a block toggle has no Required column */

    required.disabled = !displayed.checked;
    if (!displayed.checked) required.checked = false;
  }

  /* Curating options only makes sense for a field the applicant will see.
     Switching a field on restores its options, which is the half of the
     invariant that keeps an emptied field from being stuck off. */
  function syncOptionsRow(row, fromUser) {
    var optRow = optionsRow(row);
    if (!optRow) return;

    var displayed = row.querySelector('[data-displayed]').checked;
    optRow.hidden = !displayed;

    if (!displayed) {
      optRow.querySelector('.picker-options').hidden = true;
      optRow.querySelector('.picker-options__toggle').setAttribute('aria-expanded', 'false');
      return;
    }

    var inputs = optionInputs(optRow);
    if (!inputs.some(function (i) { return i.checked; })) {
      inputs.forEach(function (i) { i.checked = true; });
      paintOptionCount(optRow);
      if (fromUser) {
        announce(row.dataset.label + ' switched on, and all ' + inputs.length +
          ' of its options came back.');
      }
    }
  }

  /* Emptying a dropdown switches its field off, rather than leaving a field
     displayed with nothing in it */
  function cascadeEmptied(optRow) {
    var row = pickerBody.querySelector('[data-options="' + optRow.dataset.optionsFor + '"]');
    if (!row) return false;

    var displayed = row.querySelector('[data-displayed]');
    if (!displayed.checked || displayed.disabled) return false;
    if (optionInputs(optRow).some(function (i) { return i.checked; })) return false;

    displayed.checked = false;
    syncRow(row);
    syncOptionsRow(row);
    announce('Every ' + row.dataset.label + ' option was unticked, so ' +
      row.dataset.label + ' switched off. A dropdown needs at least one option.');
    return true;
  }

  function groupHtml(label, fields) {
    return '<p class="preview-group__head">' + label + '</p>' + fields;
  }

  function fieldHtml(part, isRequired, extra) {
    var isSelect = part.control === 'select';
    return '<div class="preview-field">' +
      '<div class="preview-field__label">' + part.label +
        (isRequired ? ' <em>Required</em>' : '') +
      '</div>' +
      '<div class="preview-field__input' + (isSelect ? ' preview-field__input--select' : '') + '">' +
        (part.placeholder || '') +
      '</div>' +
      (part.note ? '<p class="preview-field__note">' + part.note + '</p>' : '') +
      (extra || '') +
    '</div>';
  }

  /* The applicant-facing fields one picker row turns into. Usually exactly
     one; Email Address and Height/Weight are the exceptions. */
  function previewParts(row) {
    if (row.dataset.previewFields) {
      try {
        return JSON.parse(row.dataset.previewFields);
      } catch (e) {
        /* Malformed JSON should not blank the panel, so fall through */
      }
    }
    return [{
      label: row.dataset.previewLabel || row.dataset.label,
      control: row.dataset.control,
    }];
  }

  /* The options row belonging to a field, if it has one */
  function optionsRow(row) {
    return row.dataset.options
      ? document.querySelector('[data-options-for="' + row.dataset.options + '"]')
      : null;
  }

  function optionInputs(optRow) {
    return Array.prototype.slice.call(optRow.querySelectorAll('[data-option]'));
  }

  /* A muted line under the previewed dropdown naming what is in it. Three
     labels then a count, so nineteen race options do not swamp the panel. */
  function optionSummary(optRow) {
    var chosen = optionInputs(optRow).filter(function (i) { return i.checked; });
    if (!chosen.length) return '';        /* unreachable while displayed */

    var labels = chosen.map(function (i) { return i.value; });
    var head = labels.slice(0, 3).join(', ');
    var rest = labels.length - 3;
    return '<p class="preview-field__note">' + labels.length + ' option' +
      (labels.length === 1 ? '' : 's') + ': ' + head +
      (rest > 0 ? ', and ' + rest + ' more' : '') + '</p>';
  }

  /* Count on the disclosure. There is no empty state to style, because the
     invariant keeps a displayed field from ever reaching zero options. */
  function paintOptionCount(optRow) {
    var inputs = optionInputs(optRow);
    var chosen = inputs.filter(function (i) { return i.checked; }).length;
    optRow.querySelector('[data-options-count]').textContent =
      chosen + ' of ' + inputs.length + ' options shown';
  }

  /* Remote state changes are the whole point of the cascade, so they get
     announced rather than just happening somewhere else on screen */
  function announce(message) {
    var live = document.getElementById('picker-status');
    if (live) live.textContent = message;
  }

  function fieldRows() {
    return Array.prototype.slice.call(
      pickerBody.querySelectorAll('tr:not(.picker-options-row)'));
  }

  function paintPreview() {
    var rows = fieldRows();
    var shown = rows.filter(function (row) {
      return row.querySelector('[data-displayed]').checked;
    });

    var fields = shown.map(function (row) {
      var isRequired = row.querySelector('[data-required]').checked;
      var optRow = optionsRow(row);

      /* The curated option list belongs to the first part, which is the one
         the picker row actually names */
      return previewParts(row).map(function (part, i) {
        return fieldHtml(part, isRequired, i === 0 && optRow ? optionSummary(optRow) : '');
      }).join('');
    }).join('');

    /* A ticked block repeats the whole field set under its own heading. The
       primary group only gets a heading once there is a second one to tell it
       apart from. */
    var blocks = pickerBlocks
      ? Array.prototype.slice.call(pickerBlocks.querySelectorAll('[data-block]'))
          .filter(function (b) { return b.querySelector('[data-displayed]').checked; })
      : [];

    if (blocks.length && shown.length) {
      previewFields.innerHTML =
        groupHtml(pickerBody.dataset.groupLabel, fields) +
        blocks.map(function (b) {
          return groupHtml(b.dataset.blockLabel, fields);
        }).join('');
    } else {
      previewFields.innerHTML = fields;
    }

    previewEmpty.hidden = shown.length > 0;

    /* Counts picker rows, not preview fields: a derived field and a repeated
       block are consequences of a tick, not things the agency chose here */
    pickerCount.textContent = shown.length + ' of ' + rows.length + ' fields displayed';
  }

  function onChange(e) {
    /* An option checkbox lives in the row below its field, so walk back to the
       field row to re-sync the pair */
    var optRow = e.target.closest('.picker-options-row');
    if (optRow) {
      paintOptionCount(optRow);
      cascadeEmptied(optRow);
      paintPreview();
      return;
    }

    var row = e.target.closest('tr');
    if (!row) return;
    if (e.target.matches('[data-displayed]')) {
      syncRow(row);
      syncOptionsRow(row, true);
    }
    paintPreview();
  }

  pickerBody.addEventListener('change', onChange);
  if (pickerBlocks) pickerBlocks.addEventListener('change', onChange);

  /* Disclosures, and the All / None shortcuts that make nineteen checkboxes
     bearable */
  pickerBody.querySelectorAll('.picker-options-row').forEach(function (optRow) {
    var toggle = optRow.querySelector('.picker-options__toggle');
    var panel = optRow.querySelector('.picker-options');

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });

    optRow.querySelectorAll('[data-option-all], [data-option-none]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var on = btn.hasAttribute('data-option-all');
        optionInputs(optRow).forEach(function (i) { i.checked = on; });
        paintOptionCount(optRow);
        if (on) {
          announce('All options ticked.');
        } else {
          cascadeEmptied(optRow);
        }
        paintPreview();
      });
    });

    paintOptionCount(optRow);
  });

  fieldRows().forEach(function (row) { syncOptionsRow(row); });

  /* Skip: display none of this section and move on, the way the live app's
     Skip button behaves */
  var skipBtn = document.getElementById('skip-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', function () {
      fieldRows().forEach(function (row) {
        var displayed = row.querySelector('[data-displayed]');
        if (!displayed || displayed.disabled) return;
        displayed.checked = false;
        syncRow(row);
        syncOptionsRow(row);
      });
      paintPreview();
      window.location.href = skipBtn.dataset.href || '#';
    });
  }

  paintPreview();
}
