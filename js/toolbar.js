/**
 * Customizable toolbar — shared by every page.
 * Ports the reference prototype's `class Component` state machine
 * (items / active / editing / addOpen / dragKey / canLeft / canRight)
 * to a plain, framework-free JS class.
 *
 * Usage (identical on every page):
 *   <div id="toolbar"></div>
 *   <script src="js/toolbar.js"></script>
 *   <script>initToolbar('#toolbar', { activeKey: 'home' });</script>
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'rlp.toolbar.v1';

  var CATALOG = {
    home:           { label: 'Home',            icon: 'fa-solid fa-house' },
    tasks:          { label: 'My Tasks',         icon: 'fa-solid fa-list-check', badge: '12' },
    queues:         { label: 'Queues',           icon: 'fa-solid fa-inbox',      badge: '99+' },
    constituents:   { label: 'Constituents',     icon: 'fa-solid fa-users' },
    licenses:       { label: 'License Types',    icon: 'fa-solid fa-id-badge' },
    applications:   { label: 'Applications',     icon: 'fa-solid fa-file-lines' },
    metrics:        { label: 'Metrics',          icon: 'fa-solid fa-chart-column' },
    casemgmt:       { label: 'Case Management',  icon: 'fa-solid fa-folder-open' },
    flags:          { label: 'Flags',            icon: 'fa-solid fa-flag' },
    inspections:    { label: 'Inspections',      icon: 'fa-solid fa-clipboard-check' },
    denials:        { label: 'Denials',          icon: 'fa-solid fa-ban' },
    appeals:        { label: 'Appeals',          icon: 'fa-solid fa-gavel' },
    correspondence: { label: 'Correspondence',   icon: 'fa-solid fa-envelope' },
  };

  var DEFAULT_ORDER = ['home', 'tasks', 'queues', 'constituents', 'licenses', 'applications', 'metrics'];

  // Catalog keys that map to a real page. Add an entry here as more screens are built.
  var PAGE_LINKS = {
    home: 'index.html',
    tasks: 'my-tasks.html',
    queues: 'queues.html',
    licenses: 'license-types.html',
    applications: 'applications.html',
  };

  function loadPersisted() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function Toolbar(root, opts) {
    opts = opts || {};
    this.root = root;
    var saved = loadPersisted();

    this.state = {
      items: (saved && saved.items) || DEFAULT_ORDER.slice(),
      active: opts.activeKey !== undefined ? opts.activeKey : (saved ? saved.active : null),
      searchPanelVisible: (saved && typeof saved.searchPanelVisible === 'boolean') ? saved.searchPanelVisible : true,
      editing: false,
      addOpen: false,
      dragKey: null,
      canLeft: false,
      canRight: false,
    };

    this.trackEl = null;
    this._boundResize = this.updateOverflow.bind(this);
    this._boundOutsideClick = this._onOutsideClick.bind(this);
    window.addEventListener('resize', this._boundResize);
    document.addEventListener('click', this._boundOutsideClick);

    this.render();
    this._applySearchPanelVisibility();
    var self = this;
    setTimeout(function () { self.updateOverflow(); }, 80);
  }

  Toolbar.prototype.destroy = function () {
    window.removeEventListener('resize', this._boundResize);
    document.removeEventListener('click', this._boundOutsideClick);
  };

  Toolbar.prototype._persist = function () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        items: this.state.items,
        active: this.state.active,
        searchPanelVisible: this.state.searchPanelVisible,
      }));
    } catch (e) { /* storage unavailable — ignore */ }
  };

  Toolbar.prototype._applySearchPanelVisibility = function () {
    var panel = document.querySelector('.search-panel');
    if (panel) panel.style.display = this.state.searchPanelVisible ? '' : 'none';
  };

  Toolbar.prototype._onOutsideClick = function (e) {
    if (this.state.addOpen && !this.root.contains(e.target)) {
      this.state.addOpen = false;
      this.render();
    }
  };

  Toolbar.prototype.setState = function (patch, opts) {
    var itemsChanged = 'items' in patch && patch.items !== this.state.items;
    var editingChanged = 'editing' in patch && patch.editing !== this.state.editing;
    Object.assign(this.state, patch);
    this._persist();
    this.render();
    if (itemsChanged || editingChanged) {
      var self = this;
      setTimeout(function () { self.updateOverflow(); }, 80);
    }
  };

  // ---- actions (mirrors the reference Component's methods) ----

  Toolbar.prototype.toggleEdit = function () {
    this.setState({ editing: !this.state.editing, addOpen: false });
  };

  Toolbar.prototype.toggleAdd = function () {
    this.setState({ addOpen: !this.state.addOpen });
  };

  Toolbar.prototype.toggleSearchPanel = function () {
    this.setState({ searchPanelVisible: !this.state.searchPanelVisible });
    this._applySearchPanelVisibility();
  };

  Toolbar.prototype.select = function (key) {
    if (this.state.editing) return;
    if (PAGE_LINKS[key]) { window.location.href = PAGE_LINKS[key]; return; }
    this.setState({ active: key });
  };

  Toolbar.prototype.addItem = function (key) {
    this.setState({ items: this.state.items.concat([key]), addOpen: false });
  };

  Toolbar.prototype.removeItem = function (key) {
    var items = this.state.items.filter(function (k) { return k !== key; });
    var active = this.state.active === key ? (items[0] || null) : this.state.active;
    this.setState({ items: items, active: active });
  };

  Toolbar.prototype.dropOn = function (target) {
    var dragKey = this.state.dragKey;
    var items = this.state.items;
    if (!dragKey || dragKey === target) {
      this.state.dragKey = null;
      this.render();
      return;
    }
    var arr = items.filter(function (k) { return k !== dragKey; });
    var to = arr.indexOf(target);
    arr.splice(to, 0, dragKey);
    this.setState({ items: arr, dragKey: null });
  };

  // ---- overflow / chevron math (ported 1:1 from the reference) ----

  Toolbar.prototype.updateOverflow = function () {
    var el = this.trackEl;
    if (!el) return;
    var canLeft = el.scrollLeft > 2;
    var canRight = el.scrollLeft < (el.scrollWidth - el.clientWidth - 2);
    if (canLeft !== this.state.canLeft || canRight !== this.state.canRight) {
      this.state.canLeft = canLeft;
      this.state.canRight = canRight;
      this.render();
    }
  };

  Toolbar.prototype.scrollDir = function (dir) {
    var el = this.trackEl;
    if (!el) return;
    var kids = Array.prototype.slice.call(el.children);
    var vpr = el.getBoundingClientRect();
    var dest;
    if (dir > 0) {
      var t = kids.find(function (k) { return (k.getBoundingClientRect().right - vpr.right) > 1; });
      dest = t ? el.scrollLeft + (t.getBoundingClientRect().right - vpr.right) : el.scrollWidth - el.clientWidth;
    } else {
      var before = kids.filter(function (k) { return (k.getBoundingClientRect().left - vpr.left) < -1; });
      var t2 = before[before.length - 1];
      dest = t2 ? el.scrollLeft + (t2.getBoundingClientRect().left - vpr.left) : 0;
    }
    el.scrollLeft = Math.max(0, Math.min(dest, el.scrollWidth - el.clientWidth));
    this.updateOverflow();
  };

  // ---- rendering ----

  Toolbar.prototype.render = function () {
    var state = this.state;
    var html = '';

    if (state.canLeft) {
      html += '<button type="button" class="toolbar-chevron toolbar-chevron--left" aria-label="Scroll toolbar left">' +
        '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>';
    }

    html += '<div class="toolbar-track">';
    html += state.items.map(function (key) {
      var item = CATALOG[key] || { label: key, icon: 'fa-solid fa-link' };
      var active = key === state.active;
      var hasBadge = !!item.badge && !state.editing;
      var cls = state.editing
        ? 'toolbar-pill toolbar-pill--editing'
        : 'toolbar-pill' + (active ? ' is-active' : '');
      var pill = '<div class="' + cls + '" data-key="' + key + '" role="button" tabindex="0" ' +
        (state.editing ? 'draggable="true"' : '') + '>';
      if (state.editing) {
        pill += '<i class="fa-solid fa-grip-vertical toolbar-pill-grip" aria-hidden="true"></i>';
      }
      pill += '<i class="' + item.icon + '" aria-hidden="true"></i>';
      pill += '<span>' + item.label + '</span>';
      if (hasBadge) {
        pill += '<span class="toolbar-badge">' + item.badge + '</span>';
      }
      if (state.editing) {
        pill += '<button type="button" class="toolbar-pill-remove" data-remove="' + key + '" aria-label="Remove ' + item.label + '">' +
          '<i class="fa-solid fa-xmark" aria-hidden="true"></i></button>';
      }
      pill += '</div>';
      return pill;
    }).join('');
    html += '</div>';

    if (state.canRight) {
      html += '<button type="button" class="toolbar-chevron toolbar-chevron--right" aria-label="Scroll toolbar right">' +
        '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>';
    }

    if (state.editing) {
      html += '<button type="button" class="toolbar-add-btn" data-action="add">' +
        '<i class="fa-solid fa-plus" aria-hidden="true"></i>Add</button>';

      html += '<span class="toolbar-divider" aria-hidden="true"></span>';

      html += '<div class="toolbar-search-toggle" data-action="search-toggle" role="switch" ' +
        'aria-checked="' + state.searchPanelVisible + '" aria-label="Search Panel" tabindex="0">' +
        '<span class="toolbar-search-toggle__label">Search Panel</span>' +
        '<span class="toolbar-search-toggle__switch' + (state.searchPanelVisible ? ' is-on' : '') + '">' +
        '<span class="toolbar-search-toggle__knob"></span></span></div>';
    }

    html += '<button type="button" class="toolbar-customize-btn' + (state.editing ? ' is-active' : '') + '" data-action="customize">' +
      '<i class="fa-solid fa-' + (state.editing ? 'check' : 'sliders') + '" aria-hidden="true"></i>' +
      (state.editing ? 'Done' : 'Customize') + '</button>';

    if (state.addOpen) {
      var available = Object.keys(CATALOG).filter(function (k) { return state.items.indexOf(k) === -1; });
      html += '<div class="toolbar-add-menu">';
      html += '<div class="toolbar-add-menu__heading">ADD TO TOOLBAR</div>';
      if (available.length > 0) {
        html += '<div class="toolbar-add-menu__list">';
        html += available.map(function (key) {
          var item = CATALOG[key];
          return '<button type="button" class="toolbar-add-menu__row" data-add="' + key + '">' +
            '<i class="' + item.icon + ' toolbar-add-menu__row-icon" aria-hidden="true"></i>' +
            '<span class="toolbar-add-menu__row-label">' + item.label + '</span>' +
            '<i class="fa-solid fa-plus toolbar-add-menu__row-plus" aria-hidden="true"></i></button>';
        }).join('');
        html += '</div>';
      } else {
        html += '<div class="toolbar-add-menu__empty">All links are already on your toolbar.</div>';
      }
      html += '</div>';
    }

    this.root.innerHTML = html;
    this._attachHandlers();
  };

  Toolbar.prototype._attachHandlers = function () {
    var self = this;
    var root = this.root;

    this.trackEl = root.querySelector('.toolbar-track');
    this.trackEl.addEventListener('scroll', function () { self.updateOverflow(); });

    var leftChevron = root.querySelector('.toolbar-chevron--left');
    if (leftChevron) leftChevron.addEventListener('click', function () { self.scrollDir(-1); });

    var rightChevron = root.querySelector('.toolbar-chevron--right');
    if (rightChevron) rightChevron.addEventListener('click', function () { self.scrollDir(1); });

    var addBtn = root.querySelector('[data-action="add"]');
    if (addBtn) addBtn.addEventListener('click', function (e) { e.stopPropagation(); self.toggleAdd(); });

    var customizeBtn = root.querySelector('[data-action="customize"]');
    if (customizeBtn) customizeBtn.addEventListener('click', function () { self.toggleEdit(); });

    var searchToggle = root.querySelector('[data-action="search-toggle"]');
    if (searchToggle) {
      searchToggle.addEventListener('click', function () { self.toggleSearchPanel(); });
      searchToggle.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.toggleSearchPanel(); }
      });
    }

    Array.prototype.forEach.call(root.querySelectorAll('.toolbar-add-menu__row'), function (rowEl) {
      rowEl.addEventListener('click', function () { self.addItem(rowEl.getAttribute('data-add')); });
    });

    Array.prototype.forEach.call(root.querySelectorAll('.toolbar-pill'), function (pillEl) {
      var key = pillEl.getAttribute('data-key');

      pillEl.addEventListener('click', function () { self.select(key); });
      pillEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.select(key); }
      });

      pillEl.addEventListener('dragstart', function () {
        self.state.dragKey = key;
        pillEl.classList.add('toolbar-pill--dragging');
      });
      pillEl.addEventListener('dragend', function () {
        pillEl.classList.remove('toolbar-pill--dragging');
      });
      pillEl.addEventListener('dragover', function (e) { e.preventDefault(); });
      pillEl.addEventListener('drop', function (e) { e.preventDefault(); self.dropOn(key); });

      var removeBtn = pillEl.querySelector('.toolbar-pill-remove');
      if (removeBtn) {
        removeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          self.removeItem(removeBtn.getAttribute('data-remove'));
        });
      }
    });
  };

  window.initToolbar = function (selector, opts) {
    var root = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!root) return null;
    root.classList.add('toolbar');
    return new Toolbar(root, opts);
  };
})();
