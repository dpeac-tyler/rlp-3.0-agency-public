/**
 * Constituent application: the live form an applicant fills in.
 *
 * Every .ap-panel in the sheet is one sub-step, tagged with the top-level
 * step it belongs to (data-step) and its title (data-title). Panels run in
 * document order; Next and Back walk that list. The step indicator and the
 * sub-step bar are both drawn from it, so adding a panel is the only thing
 * needed to add a sub-step.
 *
 * Follow-ups: an element with data-show-when="radio-name=Value" shows only
 * while that answer is chosen, which is how a condition from the builder's
 * Conditions step behaves for the applicant.
 *
 * Markup contract: constituent-application.html.
 */
function initApply() {
  var panels = Array.prototype.slice.call(document.querySelectorAll('.ap-panel'));
  var stepsEl = document.getElementById('ap-steps');
  var stepItems = Array.prototype.slice.call(stepsEl.querySelectorAll('.ap-steps__item'));
  var subEl = document.getElementById('ap-substeps');
  var eyebrow = document.getElementById('ap-step-eyebrow');
  var backBtn = document.getElementById('ap-back');
  var nextBtn = document.getElementById('ap-next');
  var live = document.getElementById('ap-live');

  var cur = 0;
  var furthest = 0;

  /* Application contact (phone, email, URL, logo), as saved on
     agency-profile.html */
  try {
    var contact = JSON.parse(localStorage.getItem('rlp.applicationContact') || 'null');
    if (contact) {
      var phoneLink = document.getElementById('ap-phone');
      var emailLink = document.getElementById('ap-email');
      if (contact.phone) {
        phoneLink.href = 'tel:+1' + contact.phone.replace(/\D/g, '');
        phoneLink.textContent = contact.phone;
      }
      if (contact.email) {
        emailLink.href = 'mailto:' + contact.email;
        emailLink.textContent = contact.email;
      }
      var urlLink = document.getElementById('ap-url');
      if (contact.url) {
        urlLink.href = /^https?:\/\//i.test(contact.url) ? contact.url : 'https://' + contact.url;
        urlLink.textContent = contact.url;
      } else {
        urlLink.remove();
      }
      if (contact.logo) {
        var logo = document.getElementById('ap-logo');
        logo.innerHTML = '<img src="' + contact.logo + '" alt="">';
        logo.classList.add('has-img');
      }
    }
  } catch (e) {}

  function stepOf(i) { return Number(panels[i].dataset.step); }

  function siblings(step) {
    return panels.filter(function (p) { return Number(p.dataset.step) === step; });
  }

  function render(focus) {
    var step = stepOf(cur);
    var group = siblings(step);
    var pos = group.indexOf(panels[cur]);

    panels.forEach(function (p, i) { p.hidden = i !== cur; });

    stepItems.forEach(function (li) {
      var n = Number(li.dataset.step);
      li.classList.toggle('is-done', n < step);
      li.classList.toggle('is-current', n === step);
      if (n === step) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    eyebrow.textContent = 'Step ' + step + ' of ' + stepItems.length + ' · ' +
      stepItems[step - 1].querySelector('.ap-steps__label').textContent;

    /* Sub-steps: reached ones are buttons, so the applicant can go back */
    subEl.innerHTML = group.map(function (p, k) {
      var idx = panels.indexOf(p);
      var state = k < pos ? 'is-done' : k === pos ? 'is-current' : '';
      var reach = idx <= furthest && k !== pos;
      var inner = '<span class="ap-substeps__bar"></span><span class="ap-substeps__label">' + p.dataset.title + '</span>';
      return '<li class="ap-substeps__item ' + state + '"' + (k === pos ? ' aria-current="step"' : '') + '>' +
        (reach ? '<button type="button" data-go="' + idx + '">' + inner + '</button>' : inner) + '</li>';
    }).join('');

    /* The sheet's heading bar for this group */
    var head = panels[cur].querySelector('.ap-panel__head');
    if (!head) {
      head = document.createElement('h2');
      head.className = 'qb-section__bar ap-panel__head';
      head.tabIndex = -1;
      panels[cur].insertBefore(head, panels[cur].firstChild);
    }
    head.innerHTML = '<span>' + panels[cur].dataset.title + '</span>' +
      '<span class="ap-panel__count">' + (pos + 1) + ' of ' + group.length + '</span>';

    backBtn.hidden = cur === 0;
    nextBtn.disabled = cur === panels.length - 1;

    if (focus) {
      head.focus();
      live.textContent = panels[cur].dataset.title + ', ' + (pos + 1) + ' of ' + group.length;
    }
  }

  function go(i) {
    cur = Math.max(0, Math.min(panels.length - 1, i));
    furthest = Math.max(furthest, cur);
    render(true);
    document.querySelector('.ap-sheet').scrollIntoView({ block: 'start' });
  }

  nextBtn.addEventListener('click', function () { go(cur + 1); });
  backBtn.addEventListener('click', function () { go(cur - 1); });
  subEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-go]');
    if (b) go(Number(b.dataset.go));
  });

  /* Follow-up questions */
  var followups = Array.prototype.slice.call(document.querySelectorAll('[data-show-when]'));
  function syncFollowups() {
    followups.forEach(function (el) {
      var rule = el.dataset.showWhen.split('=');
      var picked = document.querySelector('input[name="' + rule[0] + '"]:checked');
      el.hidden = !picked || picked.value !== rule[1];
    });
  }
  document.addEventListener('change', syncFollowups);

  /* Column totals on row-label tables */
  document.addEventListener('input', function (e) {
    var key = e.target.dataset && e.target.dataset.sum;
    if (!key) return;
    var total = 0;
    document.querySelectorAll('[data-sum="' + key + '"]').forEach(function (c) { total += Number(c.value) || 0; });
    document.getElementById('sum-' + key).textContent = total.toLocaleString();
  });

  /* Add Row on the crew table */
  var crewRows = document.getElementById('crew-rows');
  document.getElementById('crew-add').addEventListener('click', function () {
    var n = crewRows.rows.length + 1;
    var tr = document.createElement('tr');
    tr.innerHTML = ['name', 'role', 'license number'].map(function (c) {
      return '<td><input class="ap-cell" type="text" aria-label="Crew member ' + n + ' ' + c + '"></td>';
    }).join('');
    crewRows.appendChild(tr);
    tr.querySelector('input').focus();
  });

  render(false);
}
