/**
 * View-only steps on a resumed draft.
 *
 * Getting Started, Application Type and Title Information are final once
 * answered: the answers settle the licence, the behaviours and the saved
 * application name, and the Application Type step says so in as many words.
 * v2.0 refuses to show those steps again at all. 3.0 still opens them, so the
 * agency can check what was chosen, but as a plain read-only summary of the
 * answers rather than the form: each page carries both views, and the one on
 * screen follows the flag set here.
 *
 * Reaching the builder through Edit on a draft is what "resuming" means, so
 * that link carries ?resume=1. Create New Application links carry ?new=1,
 * which clears the flag, so a fresh application gets the editable steps.
 *
 * The flag is sessionStorage, not localStorage: it describes which application
 * is open right now, not a preference that should outlive the tab.
 *
 * The <html> class is set from <head> so the CSS swaps the form for the
 * summary, and marks the rail items with a lock, before first paint.
 *
 * Markup contract: the view-only rail items carry data-lockable; on the three
 * steps, the form carries data-edit-view and the summary data-final-view.
 */
(function () {
  var KEY = 'rlp-builder-resumed';
  var root = document.documentElement;

  var params = new URLSearchParams(window.location.search);

  try {
    if (params.get('new') === '1') {
      sessionStorage.removeItem(KEY);
    } else if (params.get('resume') === '1') {
      sessionStorage.setItem(KEY, '1');
    }

    if (sessionStorage.getItem(KEY) === '1') root.classList.add('builder-resumed');
  } catch (e) {
    /* Storage blocked: nothing locks, which is the safe way to fail */
  }

  function wire() {
    if (!root.classList.contains('builder-resumed')) return;

    document.querySelectorAll('.builder-steps__item[data-lockable] a').forEach(function (a) {
      a.setAttribute('title', 'View only: these answers are final');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
