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
 *   data-derived="Re-Enter Email"       a field the system adds alongside this
 *                                       one whenever it is displayed
 *   data-preview-label="State"          shorter label the applicant sees, where
 *                                       it differs from the admin title
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

  function groupHtml(label, fields) {
    return '<p class="preview-group__head">' + label + '</p>' + fields;
  }

  function fieldHtml(label, isRequired, isSelect) {
    return '<div class="preview-field">' +
      '<div class="preview-field__label">' + label +
        (isRequired ? ' <em>Required</em>' : '') +
      '</div>' +
      '<div class="preview-field__input' + (isSelect ? ' preview-field__input--select' : '') + '"></div>' +
    '</div>';
  }

  function paintPreview() {
    var rows = Array.prototype.slice.call(pickerBody.querySelectorAll('tr'));
    var shown = rows.filter(function (row) {
      return row.querySelector('[data-displayed]').checked;
    });

    var fields = shown.map(function (row) {
      var isRequired = row.querySelector('[data-required]').checked;
      var isSelect = row.dataset.control === 'select';
      var label = row.dataset.previewLabel || row.dataset.label;
      var html = fieldHtml(label, isRequired, isSelect);

      /* A derived field is not in the picker, so it can only appear here. It
         inherits the required state of the field it confirms. */
      if (row.dataset.derived) {
        html += fieldHtml(row.dataset.derived, isRequired, false);
      }
      return html;
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
    var row = e.target.closest('tr');
    if (!row) return;
    if (e.target.matches('[data-displayed]')) syncRow(row);
    paintPreview();
  }

  pickerBody.addEventListener('change', onChange);
  if (pickerBlocks) pickerBlocks.addEventListener('change', onChange);

  paintPreview();
}
