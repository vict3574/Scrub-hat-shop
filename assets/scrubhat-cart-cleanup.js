/*
  Removes orphaned customiser add-ons (buttons / satin / embroidery) from the
  cart. Add-on lines carry properties {_addon: 'yes', For: '<hat title>'}.
  If the hat they belong to is no longer in the cart, the add-ons are deleted
  automatically so the basket can never get stuck with leftover add-ons.
  Runs on every page load and after cart changes.
*/
(function () {
  'use strict';

  var cleaning = false;

  function cleanup() {
    if (cleaning) return;
    fetch('/cart.js', { headers: { Accept: 'application/json' } })
      .then(function (res) { return res.json(); })
      .then(function (cart) {
        if (!cart || !cart.items || !cart.items.length) return;

        var hatTitles = {};
        cart.items.forEach(function (item) {
          var isAddon = item.properties && item.properties._addon === 'yes';
          if (!isAddon) hatTitles[item.product_title] = true;
        });

        var updates = {};
        var orphans = 0;
        cart.items.forEach(function (item) {
          var isAddon = item.properties && item.properties._addon === 'yes';
          if (!isAddon) return;
          var parent = item.properties && item.properties.For;
          if (!parent || !hatTitles[parent]) {
            updates[item.key] = 0;
            orphans++;
          }
        });

        if (!orphans) return;
        cleaning = true;
        fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ updates: updates })
        })
          .then(function (res) { return res.json(); })
          .then(function () {
            /* Re-render cart UI with the cleaned cart */
            if (window.location.pathname.indexOf('/cart') === 0) {
              window.location.reload();
            } else {
              document.dispatchEvent(new CustomEvent('scrubhat:cart-cleaned'));
              cleaning = false;
            }
          })
          .catch(function () {
            cleaning = false;
          });
      })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanup);
  } else {
    cleanup();
  }

  /* Re-check after any cart mutation made through the standard endpoints */
  var origFetch = window.fetch;
  window.fetch = function () {
    var url = arguments[0];
    var isCartChange =
      typeof url === 'string' &&
      (url.indexOf('/cart/change') !== -1 || url.indexOf('/cart/update') !== -1);
    var result = origFetch.apply(this, arguments);
    if (isCartChange && !cleaning) {
      result.then(function () { setTimeout(cleanup, 300); }).catch(function () {});
    }
    return result;
  };
})();
