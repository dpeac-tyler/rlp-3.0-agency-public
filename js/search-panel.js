/**
 * Search panel — the segmented Search Type control plus the field row it
 * swaps in. Shared by every page that carries the panel (Home, Applications,
 * License Types), so the behaviour stays in one place.
 *
 * The four standard types (Constituent, Invoice, License, Submission) share
 * one row; Assets and Inspections each bring their own, since those come from
 * separately configured agency features and search different fields.
 *
 * Markup contract:
 *   <div class="search-toggle-set">
 *     <button class="search-toggle__segment" data-search-type="constituent">…
 *   </div>
 *   <form class="search-field-row" data-search-row="standard">…</form>
 *   <form class="search-field-row" data-search-row="assets" hidden>…</form>
 *
 * Any data-search-type without its own row falls back to "standard".
 */
(function () {
  'use strict';

  var OWN_ROW = ['assets', 'inspections'];

  window.initSearchPanel = function (root) {
    var scope = root ? document.querySelector(root) : document;
    if (!scope) return;

    var segments = scope.querySelectorAll('.search-toggle__segment');
    var rows = scope.querySelectorAll('.search-field-row[data-search-row]');
    if (!segments.length) return;

    function rowFor(type) {
      return OWN_ROW.indexOf(type) === -1 ? 'standard' : type;
    }

    segments.forEach(function (segment) {
      segment.addEventListener('click', function () {
        segments.forEach(function (s) {
          s.classList.remove('is-active');
          if (s.hasAttribute('aria-pressed')) s.setAttribute('aria-pressed', 'false');
        });
        segment.classList.add('is-active');
        if (segment.hasAttribute('aria-pressed')) segment.setAttribute('aria-pressed', 'true');

        var row = rowFor(segment.getAttribute('data-search-type'));
        rows.forEach(function (el) {
          el.hidden = el.getAttribute('data-search-row') !== row;
        });
      });
    });
  };
})();
