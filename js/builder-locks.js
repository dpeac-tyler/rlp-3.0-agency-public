/**
 * Locked steps on a resumed draft.
 *
 * Application Type and Title Information are final once answered: the answers
 * settle the licence, the behaviours and the saved application name, and the
 * Application Type step says so in as many words. v2.0 enforces it by refusing
 * to show those steps again, rendering them greyed and unclickable in the rail
 * with a blocked marker instead of their number.
 *
 * Reaching the builder through Edit on a draft is what "resuming" means, so
 * that link carries ?resume=1 and lands on the first step that is still
 * editable. Arriving at Getting Started is a fresh application by definition,
 * so that clears the flag; ?new=1 clears it too.
 *
 * The flag is sessionStorage, not localStorage: it describes which application
 * is open right now, not a preference that should outlive the tab.
 *
 * The <html> class is set from <head> so the CSS dims the locked steps before
 * first paint. This script's only job in the DOM is removing their href, which
 * is what actually makes them unreachable by mouse and keyboard alike, since an
 * anchor without href is not focusable.
 *
 * Markup contract: the lockable rail items carry data-lockable.
 */
(function () {
  var KEY = 'rlp-builder-resumed';
  var LOCKED_PAGES = [
    'builder-getting-started.html',
    'builder-application-type.html',
    'builder-title-information.html',
  ];
  var root = document.documentElement;

  var params = new URLSearchParams(window.location.search);
  var here = window.location.pathname.split('/').pop();

  try {
    if (params.get('new') === '1' || here === 'builder-getting-started.html') {
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

    var why = 'Answered on a step that is now final, so it cannot be changed';

    document.querySelectorAll('.builder-steps__item[data-lockable] a').forEach(function (a) {
      a.removeAttribute('href');
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('title', why);
    });

    /* A Back button pointing into a locked step would walk straight past the
       lock, so it goes: the first editable step has nothing behind it. */
    document.querySelectorAll('.builder-actions a.btn--secondary').forEach(function (btn) {
      var target = (btn.getAttribute('href') || '').split('?')[0];
      if (LOCKED_PAGES.indexOf(target) !== -1) btn.hidden = true;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
