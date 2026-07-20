/*
  Scrub Hat Shop customiser (theme-native TeeInBlue replacement).
  - Yes/No add-ons: buttons, satin lining (+colour), embroidery (+placement, thread colour, 3 text lines)
  - Live text preview on the FIRST product image only
  - On add to cart: adds the hat with all choices as line item properties,
    plus the hidden add-on products, in a single cart request.
*/
(function () {
  'use strict';

  var PALETTE = [
    ['Black', '#050505'],
    ['White', '#FEFEFE'],
    ['Citrus', '#FACD02'],
    ['Emerald', '#269C22'],
    ['Fir', '#0B4C08'],
    ['Silver', '#CCCCCC'],
    ['Orange', '#FC8F05'],
    ['Red', '#E00B20'],
    ['Coral', '#FA787F'],
    ['Royal Blue', '#0D0F78'],
    ['Pastel Yellow', '#F5FA73'],
    ['Magenta', '#DE124B'],
    ['Purple', '#58146B'],
    ['Cadbury', '#BD2284'],
    ['Copper', '#B34C12'],
    ['Lime', '#22F01A'],
    ['Chocolate', '#543611'],
    ['Cornflower', '#A2A5F5'],
    ['Light Blue', '#87DAE6'],
    ['Baby pink', '#FACAD0'],
    ['Azalea', '#FA3964'],
    ['Pastel green', '#D5E868'],
    ['Mid Blue', '#33A396'],
    ['Candy Pink', '#FA7DAF'],
    ['Fuschia', '#EB5B9C']
  ];

  var SATIN_PALETTE = [
    ['Black', '#050505'],
    ['Grey', '#524F50'],
    ['Green', '#13703B'],
    ['Hot Pink', '#E82A82'],
    ['Chocolate', '#422812'],
    ['Baby Pink', '#F5879A'],
    ['Light blue', '#B0BDF5'],
    ['Orange', '#F72F07'],
    ['Purple', '#3A0C47'],
    ['Red', '#D40418'],
    ['Blue', '#0842BF']
  ];

  var EMOJI_RE = /(?:[\u2190-\u2BFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|\uFE0F|\u200D)/g;

  function init() {
    var root = document.querySelector('.scrubhat-customiser');
    if (!root || root.dataset.customiserReady) return;
    root.dataset.customiserReady = 'true';

    var configEl = root.querySelector('[data-customiser-config]');
    if (!configEl) return;
    var config;
    try {
      config = JSON.parse(configEl.textContent);
    } catch (e) {
      return;
    }

    var state = {
      buttons: 'no',
      satin: 'no',
      satinColour: null,
      embroidery: 'no',
      placement: 'Side',
      thread: null,
      lines: ['', '', '']
    };

    /* ---------- pills ---------- */
    root.querySelectorAll('.scrubhat-customiser__group').forEach(function (group) {
      var addon = group.dataset.addon;
      group.querySelectorAll('.scrubhat-customiser__pill').forEach(function (pill) {
        pill.addEventListener('click', function () {
          group
            .querySelectorAll('.scrubhat-customiser__pill')
            .forEach(function (p) { p.classList.remove('is-selected'); });
          pill.classList.add('is-selected');
          state[addon] = pill.dataset.value;
          var reveal = group.querySelector('[data-reveal]');
          if (reveal) reveal.hidden = pill.dataset.value !== 'yes';
          updatePreview();
          hideError();
        });
      });
    });

    /* ---------- swatches ---------- */
    function buildSwatches(container, onSelect, palette) {
      (palette || PALETTE).forEach(function (entry) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'scrubhat-customiser__swatch';
        b.style.backgroundColor = entry[1];
        b.title = entry[0];
        b.setAttribute('aria-label', entry[0]);
        b.dataset.name = entry[0];
        b.dataset.hex = entry[1];
        b.addEventListener('click', function () {
          container
            .querySelectorAll('.scrubhat-customiser__swatch')
            .forEach(function (s) { s.classList.remove('is-selected'); });
          b.classList.add('is-selected');
          onSelect(entry[0], entry[1]);
          hideError();
        });
        container.appendChild(b);
      });
    }

    var threadContainer = root.querySelector('[data-swatches="thread"]');
    if (threadContainer) {
      buildSwatches(threadContainer, function (name, hex) {
        state.thread = { name: name, hex: hex };
        var label = root.querySelector('[data-selected-label="thread"]');
        if (label) label.textContent = 'Thread colour: ' + name;
        updatePreview();
      });
    }

    var satinContainer = root.querySelector('[data-swatches="satin"]');
    if (satinContainer) {
      buildSwatches(
        satinContainer,
        function (name) {
          state.satinColour = name;
          var label = root.querySelector('[data-selected-label="satin"]');
          if (label) label.textContent = 'Satin colour: ' + name;
        },
        SATIN_PALETTE
      );
    }

    /* ---------- placement ---------- */
    root.querySelectorAll('.scrubhat-customiser__placement').forEach(function (btn) {
      btn.addEventListener('click', function () {
        root
          .querySelectorAll('.scrubhat-customiser__placement')
          .forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
        state.placement = btn.dataset.placement;
      });
    });

    /* ---------- text lines (emoji blocked, no max length) ---------- */
    root.querySelectorAll('[data-line]').forEach(function (input) {
      input.addEventListener('input', function () {
        var clean = input.value.replace(EMOJI_RE, '');
        if (clean !== input.value) input.value = clean;
        state.lines[parseInt(input.dataset.line, 10) - 1] = clean;
        updatePreview();
        hideError();
      });
    });

    /* ---------- live preview on FIRST product image only ---------- */
    var previewEl = null;
    function ensurePreview() {
      if (previewEl) return previewEl;
      var firstMedia = document.querySelector(
        '.product__media-list .product__media-item:first-child .product__media'
      );
      if (!firstMedia) return null;
      firstMedia.style.position = 'relative';
      previewEl = document.createElement('div');
      previewEl.className = 'scrubhat-customiser__preview';
      previewEl.setAttribute('aria-hidden', 'true');
      firstMedia.appendChild(previewEl);
      return previewEl;
    }

    function updatePreview() {
      var el = ensurePreview();
      if (!el) return;
      var hasText = state.lines.some(function (l) { return l.trim() !== ''; });
      if (state.embroidery !== 'yes' || !hasText) {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'block';
      el.style.color = state.thread ? state.thread.hex : '#050505';
      el.innerHTML = '';
      state.lines.forEach(function (line) {
        if (line.trim() === '') return;
        var span = document.createElement('span');
        span.textContent = line;
        el.appendChild(span);
      });
    }

    /* ---------- validation + error ---------- */
    var errorEl = root.querySelector('[data-customiser-error]');
    function showError(msg) {
      if (!errorEl) return;
      errorEl.textContent = msg;
      errorEl.hidden = false;
      errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function hideError() {
      if (errorEl) errorEl.hidden = true;
    }

    function validate() {
      if (state.satin === 'yes' && !state.satinColour) {
        showError('Please choose a satin colour.');
        return false;
      }
      if (state.embroidery === 'yes') {
        if (!state.thread) {
          showError('Please choose a thread colour for your embroidery.');
          return false;
        }
        if (state.lines[0].trim() === '') {
          showError('Please fill in Line #1 for your embroidery.');
          return false;
        }
      }
      return true;
    }

    /* ---------- properties ---------- */
    function hatProperties() {
      var props = {};
      if (config.addons.buttons) props['Buttons'] = state.buttons === 'yes' ? 'Yes' : 'No';
      if (config.addons.satin) {
        props['Satin lining'] = state.satin === 'yes' ? 'Yes' : 'No';
        if (state.satin === 'yes') props['Satin colour'] = state.satinColour;
      }
      if (config.addons.embroidery) {
        props['Embroidery'] = state.embroidery === 'yes' ? 'Yes' : 'No';
        if (state.embroidery === 'yes') {
          props['Embroidery placement'] = state.placement;
          props['Thread colour'] = state.thread.name;
          if (state.lines[0].trim()) props['Line 1'] = state.lines[0];
          if (state.lines[1].trim()) props['Line 2'] = state.lines[1];
          if (state.lines[2].trim()) props['Line 3'] = state.lines[2];
        }
      }
      return props;
    }

    function selectedAddons() {
      var items = [];
      if (state.buttons === 'yes' && config.addons.buttons) {
        items.push({
          id: config.addons.buttons.variantId,
          quantity: 1,
          properties: { For: config.productTitle }
        });
      }
      if (state.satin === 'yes' && config.addons.satin) {
        items.push({
          id: config.addons.satin.variantId,
          quantity: 1,
          properties: { For: config.productTitle, 'Satin colour': state.satinColour }
        });
      }
      if (state.embroidery === 'yes' && config.addons.embroidery) {
        items.push({
          id: config.addons.embroidery.variantId,
          quantity: 1,
          properties: {
            For: config.productTitle,
            Placement: state.placement,
            'Thread colour': state.thread ? state.thread.name : '',
            'Line 1': state.lines[0] || '',
            'Line 2': state.lines[1] || '',
            'Line 3': state.lines[2] || ''
          }
        });
      }
      return items;
    }

    /* ---------- intercept add to cart ---------- */
    var productForms = document.querySelectorAll('form[action*="/cart/add"]');
    productForms.forEach(function (form) {
      if (form.closest('.quick-add')) return;
      form.addEventListener(
        'submit',
        function (event) {
          var anySelected =
            state.buttons === 'yes' || state.satin === 'yes' || state.embroidery === 'yes';

          if (!validate()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
          }
          if (!anySelected) return; /* nothing chosen: let the theme handle it normally */

          event.preventDefault();
          event.stopImmediatePropagation();

          var idInput = form.querySelector('[name="id"]');
          var qtyInput = form.querySelector('[name="quantity"]');
          var variantId = idInput ? parseInt(idInput.value, 10) : null;
          var quantity = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
          if (!variantId) return;

          var submitBtn = form.querySelector('[type="submit"]');
          if (submitBtn) {
            submitBtn.setAttribute('disabled', 'disabled');
            submitBtn.classList.add('loading');
          }

          var items = selectedAddons();
          items.push({ id: variantId, quantity: quantity, properties: hatProperties() });

          fetch(window.Shopify && window.Shopify.routes ? window.Shopify.routes.root + 'cart/add.js' : '/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ items: items })
          })
            .then(function (res) {
              if (!res.ok) return res.json().then(function (d) { throw d; });
              window.location.href = '/cart';
            })
            .catch(function (err) {
              showError(
                (err && err.description) ||
                  'Something went wrong adding your customised hat. Please try again.'
              );
              if (submitBtn) {
                submitBtn.removeAttribute('disabled');
                submitBtn.classList.remove('loading');
              }
            });
        },
        true
      );
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
