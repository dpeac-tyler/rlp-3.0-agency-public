/**
 * Control icon legend — replaces the old "Icon Key" accordion.
 *
 * A link sits to the right of the entry count in the table controls bar; clicking
 * it reveals a legend panel between the controls bar and the table.
 *
 * Markup contract (see my-tasks.html / applications.html for reference):
 *   <div class="table-controls">
 *     <div class="table-controls__count">
 *       Showing 1 - 5 of 5 Entries
 *       <button type="button" class="icon-legend-toggle" aria-expanded="false" aria-controls="LEGEND_ID">
 *         What do the control icons mean?
 *         <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
 *       </button>
 *     </div>
 *     ...
 *   </div>
 *   <div class="icon-legend" id="LEGEND_ID" hidden>
 *     <div class="icon-legend__item"><img src="assets/eye-icon.png" alt=""> View Task</div>
 *     ...
 *   </div>
 *
 * Usage: load this script and call initIconLegends() — it wires every toggle on
 * the page via its aria-controls target, so a page with several tables (or
 * several tab views) needs no extra code.
 */
function initIconLegends(root) {
  var scope = root || document;

  scope.querySelectorAll('.icon-legend-toggle').forEach(function (toggle) {
    var legend = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!legend) return;

    toggle.addEventListener('click', function () {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      legend.hidden = expanded;
    });
  });
}
