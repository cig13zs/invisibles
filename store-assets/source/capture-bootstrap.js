'use strict';

(function () {
  var input = document.getElementById('in');
  var clean = document.getElementById('clean');
  var output = document.getElementById('out');
  var summary = document.getElementById('summary');

  input.value = 'Release\u200b notes\u00a0ready \u2066for review\u2069.';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  clean.click();

  if (!/hidden character/i.test(summary.textContent) || output.hidden || !output.value) {
    parent.document.documentElement.setAttribute('data-capture-error', 'The shipped side panel did not render the sample.');
    return;
  }
  parent.document.documentElement.setAttribute('data-capture-ready', 'true');
}());
