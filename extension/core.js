// Invisibles: find and remove hidden Unicode characters (zero-width, fake spaces,
// bidi controls, tag chars, variation selectors). Works in the browser
// (window.Invisibles) and in Node via require. No dependencies.
;(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Invisibles = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // Human names for the code points people actually run into. Anything not listed
  // still gets caught by the range rules below and shown as its U+XXXX code.
  var NAMES = {
    0x00A0: 'No-Break Space (NBSP)',
    0x00AD: 'Soft Hyphen',
    0x061C: 'Arabic Letter Mark',
    0x200B: 'Zero-Width Space',
    0x200C: 'Zero-Width Non-Joiner',
    0x200D: 'Zero-Width Joiner',
    0x200E: 'Left-to-Right Mark',
    0x200F: 'Right-to-Left Mark',
    0x2028: 'Line Separator',
    0x2029: 'Paragraph Separator',
    0x202A: 'Left-to-Right Embedding',
    0x202B: 'Right-to-Left Embedding',
    0x202C: 'Pop Directional Formatting',
    0x202D: 'Left-to-Right Override',
    0x202E: 'Right-to-Left Override',
    0x202F: 'Narrow No-Break Space (NNBSP)',
    0x205F: 'Medium Mathematical Space',
    0x2060: 'Word Joiner',
    0x2066: 'Left-to-Right Isolate',
    0x2067: 'Right-to-Left Isolate',
    0x2068: 'First Strong Isolate',
    0x2069: 'Pop Directional Isolate',
    0x3000: 'Ideographic Space',
    0x1680: 'Ogham Space Mark',
    0x2800: 'Braille Pattern Blank',
    0xFEFF: 'Zero-Width No-Break Space (BOM)',
    0xFFFC: 'Object Replacement Character'
  };

  // Labels shown in the UI.
  var CATEGORIES = {
    'zero-width':          'Zero-width: invisible, breaks search/passwords/code',
    'space':               'Look-alike space: not a real space (NBSP, NNBSP, ...)',
    'bidi':                'Bidirectional control: can reorder or hide text (Trojan Source)',
    'soft-hyphen':         'Soft hyphen: invisible unless the line wraps',
    'tag-char':            'Tag character: invisible, used to smuggle hidden text or prompts',
    'variation-selector':  'Variation selector: invisible, can carry hidden data',
    'control':             'Control character: non-printing, often breaks parsers'
  };

  // classify(cp) -> {category, action} or null if the character is fine to keep.
  // action: 'strip' = delete it, 'space' = replace with a normal space (keeps word gaps).
  function classify(cp) {
    if (cp === 0x09 || cp === 0x0A || cp === 0x0D || cp === 0x20) return null; // tab, LF, CR, space: keep

    if (cp <= 0x1F || (cp >= 0x7F && cp <= 0x9F)) return { category: 'control', action: 'strip' };
    if (cp === 0x2028 || cp === 0x2029) return { category: 'control', action: 'strip' };

    if (cp === 0x00AD) return { category: 'soft-hyphen', action: 'strip' };

    if (cp === 0x00A0 || cp === 0x1680 || (cp >= 0x2000 && cp <= 0x200A) ||
        cp === 0x202F || cp === 0x205F || cp === 0x3000) {
      return { category: 'space', action: 'space' };
    }

    if (cp === 0x200B || cp === 0x200C || cp === 0x200D || cp === 0x2060 ||
        cp === 0xFEFF || cp === 0x2800 ||
        cp === 0xFFF9 || cp === 0xFFFA || cp === 0xFFFB || cp === 0xFFFC) {
      return { category: 'zero-width', action: 'strip' };
    }

    if (cp === 0x061C || cp === 0x200E || cp === 0x200F ||
        (cp >= 0x202A && cp <= 0x202E) || (cp >= 0x2066 && cp <= 0x2069)) {
      return { category: 'bidi', action: 'strip' };
    }

    if ((cp >= 0xFE00 && cp <= 0xFE0F) || (cp >= 0xE0100 && cp <= 0xE01EF)) {
      return { category: 'variation-selector', action: 'strip' };
    }

    if (cp >= 0xE0000 && cp <= 0xE007F) return { category: 'tag-char', action: 'strip' };

    return null;
  }

  // --- emoji sequences ------------------------------------------------------
  // A zero-width joiner, a variation selector or tag characters are also how
  // ordinary emoji are built: 👨‍👩‍👧 is three people joined by ZWJ, ❤️ is a heart
  // plus VS16, and the England flag is a black flag plus tag letters. Stripping
  // them breaks the emoji, so these exact uses are kept and not flagged.
  // Anything outside them (a joiner between letters, a second selector stacked
  // on an emoji, tag letters that spell something other than a flag) is still
  // flagged, because that is where hidden data goes.
  var PICTO = /\p{Extended_Pictographic}/u;
  var KEYCAP_BASE = /[0-9#*]/;
  // England, Scotland, Wales: the only subdivision flags emoji keyboards offer.
  var FLAG_TAGS = ['gbeng', 'gbsct', 'gbwls'];

  function isPicto(cp) { return cp !== undefined && PICTO.test(String.fromCodePoint(cp)); }
  function isSkinTone(cp) { return cp >= 0x1F3FB && cp <= 0x1F3FF; }

  function codePoints(text) {
    var list = [];
    for (var idx = 0; idx < text.length; ) {
      var cp = text.codePointAt(idx);
      list.push({ cp: cp, index: idx });
      idx += cp > 0xFFFF ? 2 : 1;
    }
    return list;
  }

  // emojiParts(text) -> {index: true} for each code unit index that holds a
  // joiner, selector or tag character belonging to a real emoji.
  function emojiParts(text) {
    var keep = {};
    if (typeof text !== 'string' || !text) return keep;
    var cps = codePoints(text);
    for (var i = 0; i < cps.length; i++) {
      var cp = cps[i].cp, prev = i > 0 ? cps[i - 1].cp : undefined;

      if (cp === 0xFE0F || cp === 0xFE0E) {
        // One selector right after a pictograph, or a keycap: 1️⃣ is 1 + VS16 + U+20E3.
        var next = i + 1 < cps.length ? cps[i + 1].cp : undefined;
        if (isPicto(prev) || (cp === 0xFE0F && KEYCAP_BASE.test(String.fromCodePoint(prev || 0x20)) && next === 0x20E3)) {
          keep[cps[i].index] = true;
        }
      } else if (cp === 0x200D) {
        // Joins two pictographs; the left one may carry a selector or a skin tone.
        var j = i - 1;
        while (j >= 0 && (cps[j].cp === 0xFE0F || isSkinTone(cps[j].cp))) j--;
        var after = i + 1 < cps.length ? cps[i + 1].cp : undefined;
        if (j >= 0 && j >= i - 2 && isPicto(cps[j].cp) && isPicto(after)) keep[cps[i].index] = true;
      } else if (cp === 0x1F3F4) {
        // Black flag + tag letters + cancel tag.
        var letters = '', k = i + 1;
        while (k < cps.length && cps[k].cp >= 0xE0061 && cps[k].cp <= 0xE007A && letters.length < 6) {
          letters += String.fromCharCode(cps[k].cp - 0xE0000);
          k++;
        }
        if (k < cps.length && cps[k].cp === 0xE007F && FLAG_TAGS.indexOf(letters) !== -1) {
          for (var t = i + 1; t <= k; t++) keep[cps[t].index] = true;
        }
      }
    }
    return keep;
  }

  function hex(cp) { var s = cp.toString(16).toUpperCase(); while (s.length < 4) s = '0' + s; return 'U+' + s; }
  function nameOf(cp) { return NAMES[cp] || hex(cp); }

  // scan(text) -> {findings:[{index,cp,hex,name,category}], counts:{cat:n}, total, emojiKept}
  // emojiKept counts the joiners, selectors and tag characters left alone
  // because they are part of an emoji.
  function scan(text) {
    var findings = [], counts = {}, emojiKept = 0;
    if (typeof text !== 'string') return { findings: findings, counts: counts, total: 0, emojiKept: 0 };
    var keep = emojiParts(text);
    for (var idx = 0; idx < text.length; ) {
      var cp = text.codePointAt(idx);
      var c = classify(cp);
      if (c && keep[idx]) {
        emojiKept++;
      } else if (c) {
        findings.push({ index: idx, cp: cp, hex: hex(cp), name: nameOf(cp), category: c.category });
        counts[c.category] = (counts[c.category] || 0) + 1;
      }
      idx += cp > 0xFFFF ? 2 : 1;
    }
    return { findings: findings, counts: counts, total: findings.length, emojiKept: emojiKept };
  }

  // clean(text) -> text with every flagged character removed (look-alike spaces -> a real space).
  function clean(text) {
    if (typeof text !== 'string') return '';
    var out = '', keep = emojiParts(text);
    for (var idx = 0; idx < text.length; ) {
      var cp = text.codePointAt(idx);
      var c = classify(cp);
      if (!c || keep[idx]) out += String.fromCodePoint(cp);
      else if (c.action === 'space') out += ' ';
      idx += cp > 0xFFFF ? 2 : 1;
    }
    return out;
  }

  // clean(text, opts) with opts.skip: categories to leave untouched, so the
  // panel can offer per-category cleaning instead of all-or-nothing.
  function cleanWith(text, skip) {
    if (!skip || !skip.length) return clean(text);
    if (typeof text !== 'string') return '';
    var out = '', keep = emojiParts(text);
    for (var idx = 0; idx < text.length; ) {
      var cp = text.codePointAt(idx);
      var c = classify(cp);
      if (!c || keep[idx]) out += String.fromCodePoint(cp);
      else if (skip.indexOf(c.category) !== -1) out += String.fromCodePoint(cp);
      else if (c.action === 'space') out += ' ';
      idx += cp > 0xFFFF ? 2 : 1;
    }
    return out;
  }

  // visualize(text) -> array of segments: {text} for normal runs,
  // {hidden:true, label, hex, category} for each flagged character. The UI
  // renders hidden ones as visible marks so people can see WHERE the problems
  // sit inside their own text.
  function visualize(text) {
    var segments = [];
    if (typeof text !== 'string' || !text) return segments;
    var findings = {};
    scan(text).findings.forEach(function (f) { findings[f.index] = f; });
    var run = '';
    for (var idx = 0; idx < text.length; ) {
      var cp = text.codePointAt(idx);
      var f = findings[idx];
      if (f) {
        if (run) { segments.push({ text: run }); run = ''; }
        segments.push({ hidden: true, label: nameOf(cp), hex: f.hex, category: f.category });
      } else {
        run += String.fromCodePoint(cp);
      }
      idx += cp > 0xFFFF ? 2 : 1;
    }
    if (run) segments.push({ text: run });
    return segments;
  }

  // normalizePunctuation(text) -> opt-in: fancy typography down to plain ASCII.
  // Separate from clean() because these characters are visible and often wanted.
  function normalizePunctuation(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/[‘’‚‛]/g, "'")
      .replace(/[“”„‟]/g, '"')
      .replace(/…/g, '...')
      .replace(/[—―]/g, '--')
      .replace(/–/g, '-')
      .replace(/−/g, '-');
  }

  return {
    scan: scan,
    clean: clean,
    cleanWith: cleanWith,
    visualize: visualize,
    normalizePunctuation: normalizePunctuation,
    classify: classify,
    emojiParts: emojiParts,
    nameOf: nameOf,
    hex: hex,
    CATEGORIES: CATEGORIES,
    VERSION: '1.3.1'
  };
});
