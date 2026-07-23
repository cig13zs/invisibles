/*
 * Invisibles — detect and strip hidden / invisible / dangerous Unicode characters.
 * Pure, dependency-free, works in the browser (window.Invisibles) and Node (require).
 * Nothing here touches the network. It never throws on bad input.
 */
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

  // Category labels shown to the user, with a one-line why-it-matters.
  var CATEGORIES = {
    'zero-width':          'Zero-width — invisible, breaks search/passwords/code',
    'space':               'Look-alike space — not a normal space (NBSP, NNBSP, …)',
    'bidi':                'Bidirectional control — can reorder/hide text (Trojan Source)',
    'soft-hyphen':         'Soft hyphen — invisible unless the line wraps',
    'tag-char':            'Tag character — invisible, used to smuggle hidden text/prompts',
    'variation-selector':  'Variation selector — invisible, can carry hidden data',
    'control':             'Control character — non-printing, often breaks parsers'
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

  function hex(cp) { var s = cp.toString(16).toUpperCase(); while (s.length < 4) s = '0' + s; return 'U+' + s; }
  function nameOf(cp) { return NAMES[cp] || hex(cp); }

  // scan(text) -> {findings:[{index,cp,hex,name,category}], counts:{cat:n}, total}
  function scan(text) {
    var findings = [], counts = {};
    if (typeof text !== 'string') return { findings: findings, counts: counts, total: 0 };
    for (var idx = 0; idx < text.length; ) {
      var cp = text.codePointAt(idx);
      var c = classify(cp);
      if (c) {
        findings.push({ index: idx, cp: cp, hex: hex(cp), name: nameOf(cp), category: c.category });
        counts[c.category] = (counts[c.category] || 0) + 1;
      }
      idx += cp > 0xFFFF ? 2 : 1;
    }
    return { findings: findings, counts: counts, total: findings.length };
  }

  // clean(text) -> text with every flagged character removed (look-alike spaces -> a real space).
  function clean(text) {
    if (typeof text !== 'string') return '';
    var out = '';
    for (var idx = 0; idx < text.length; ) {
      var cp = text.codePointAt(idx);
      var c = classify(cp);
      if (!c) out += String.fromCodePoint(cp);
      else if (c.action === 'space') out += ' ';
      idx += cp > 0xFFFF ? 2 : 1;
    }
    return out;
  }

  // normalizePunctuation(text) -> opt-in: turn "fancy" typography (the AI tells) into plain ASCII.
  // Kept separate from clean() because these characters are visible and sometimes wanted.
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
    normalizePunctuation: normalizePunctuation,
    classify: classify,
    nameOf: nameOf,
    hex: hex,
    CATEGORIES: CATEGORIES,
    VERSION: '1.0.0'
  };
});
