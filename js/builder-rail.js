/**
 * Builder rail collapse.
 *
 * The step rail is 320px of chrome on every builder page. On the steps that
 * carry a live preview of the applicant's form there is real competition for
 * width, so the rail can be collapsed to a 56px strip that keeps the toggle
 * and the progress bar.
 *
 * The choice is remembered in localStorage rather than per page, because the
 * rail would otherwise spring back open on every Next and the toggle would be
 * useless. The class goes on <html> from this script running in <head>, before
 * the body is parsed, so a collapsed rail never flashes open first.
 *
 * Markup contract (see any builder-*.html):
 *   <script src="js/builder-rail.js"></script>   <!-- in <head>, not deferred -->
 *   <aside class="builder-rail" id="builder-rail">
 *     <button class="builder-rail__toggle" id="rail-toggle"
 *             aria-expanded="true" aria-controls="builder-rail" title="Collapse menu">
 *       <i class="fa-solid fa-angles-left" aria-hidden="true"></i>
 *       <span class="builder-rail__toggle-label" id="rail-toggle-label">Collapse menu</span>
 *     </button>
 */
(function () {
  var KEY = 'rlp-builder-rail-collapsed';
  var root = document.documentElement;

  try {
    if (localStorage.getItem(KEY) === '1') root.classList.add('rail-collapsed');
  } catch (e) {
    /* Private browsing or a file:// origin with storage blocked: the rail just
       opens expanded every time, which is the safe way to fail */
  }

  function wire() {
    var toggle = document.getElementById('rail-toggle');
    var label = document.getElementById('rail-toggle-label');
    if (!toggle) return;

    /* The visible label is the button's accessible name while the rail is
       open. Collapsed it is hidden, so aria-label has to carry the name, and
       both are set to the same string to satisfy Label in Name. */
    function paint() {
      var collapsed = root.classList.contains('rail-collapsed');
      var text = collapsed ? 'Expand menu' : 'Collapse menu';
      if (label) label.textContent = text;
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.setAttribute('aria-label', text);
      toggle.setAttribute('title', text);
    }

    toggle.addEventListener('click', function () {
      var collapsed = root.classList.toggle('rail-collapsed');
      try { localStorage.setItem(KEY, collapsed ? '1' : '0'); } catch (e) {}
      paint();
    });

    paint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
