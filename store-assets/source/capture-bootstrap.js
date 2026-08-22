'use strict';

(function () {
  var input = document.getElementById('in');
  var clean = document.getElementById('clean');
  var output = document.getElementById('out');
  var summary = document.getElementById('summary');
  var mode = new URLSearchParams(location.search).get('mode') || 'clean';

  input.value = mode === 'review'
    ? 'user\u200b_id,name\u00a0\nalpha,1'
    : 'Release\u200b notes\u00a0ready \u2066for review\u2069.';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  if (mode !== 'review') clean.click();

  var cleanStateReady = mode === 'review'
    ? !clean.disabled && output.hidden
    : !output.hidden && Boolean(output.value);
  if (!/hidden character/i.test(summary.textContent) || !cleanStateReady) {
    parent.document.documentElement.setAttribute('data-capture-error', 'The shipped side panel did not render the sample.');
    return;
  }
  parent.document.documentElement.setAttribute('data-capture-ready', 'true');
}());
