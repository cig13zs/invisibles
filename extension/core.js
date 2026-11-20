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
    0x034F: 'Combining Grapheme Joiner',
    0x180E: 'Mongolian Vowel Separator',
    0x2061: 'Function Application',
    0x2062: 'Invisible Times',
    0x2063: 'Invisible Separator',
    0x2064: 'Invisible Plus',
    0x206A: 'Inhibit Symmetric Swapping',
    0x206B: 'Activate Symmetric Swapping',
    0x206C: 'Inhibit Arabic Form Shaping',
    0x206D: 'Activate Arabic Form Shaping',
    0x206E: 'National Digit Shapes',
    0x206F: 'Nominal Digit Shapes',
    0x2800: 'Braille Pattern Blank',
    0x3164: 'Hangul Filler',
    0xFEFF: 'Zero-Width No-Break Space (BOM)',
    0xFFA0: 'Halfwidth Hangul Filler',
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

    // Blank-looking fillers and invisible operators. They survive a lot of
    // copy/paste paths and are not part of a normal word.
    if (cp === 0x034F || cp === 0x180E || cp === 0x3164 || cp === 0xFFA0 ||
        (cp >= 0x2061 && cp <= 0x2064) || (cp >= 0x206A && cp <= 0x206F)) {
      return { category: 'zero-width', action: 'strip' };
    }

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

  // decodeHidden(text) -> [{kind, text, index, length}] for text carried by
  // invisible characters. Two known ways to hide text in plain sight:
  //   'tag'      - tag characters U+E0020..U+E007E mirror printable ASCII
  //                ("ASCII smuggling", used to slip instructions past readers).
  //   'selector' - variation selectors as bytes: U+FE00..U+FE0F are 0..15 and
  //                U+E0100..U+E01EF are 16..255, read as UTF-8.
  // index and length are in code units. Emoji parts are skipped. A selector run
  // is reported only when it is two or more long and decodes to clean UTF-8,
  // so a stray selector is not shown as a message.
  function decodeHidden(text) {
    var found = [];
    if (typeof text !== 'string' || !text) return found;
    var keep = emojiParts(text), cps = codePoints(text);
    var MAX = 2000;

    function selectorByte(cp) {
      if (cp >= 0xFE00 && cp <= 0xFE0F) return cp - 0xFE00;
      if (cp >= 0xE0100 && cp <= 0xE01EF) return cp - 0xE0100 + 16;
      return -1;
    }
    function utf8(bytes) {
      try {
        var s = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
        return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(s) ? null : s;
      } catch (e) { return null; }
    }

    for (var i = 0; i < cps.length; ) {
      var cp = cps[i].cp;
      if (keep[cps[i].index]) { i++; continue; }

      if (cp >= 0xE0020 && cp <= 0xE007E) {
        var start = i, msg = '';
        while (i < cps.length && cps[i].cp >= 0xE0020 && cps[i].cp <= 0xE007E && !keep[cps[i].index]) {
          if (msg.length < MAX) msg += String.fromCharCode(cps[i].cp - 0xE0000);
          i++;
        }
        if (i < cps.length && cps[i].cp === 0xE007F && !keep[cps[i].index]) i++; // cancel tag ends it
        if (msg.trim()) found.push({ kind: 'tag', text: msg, index: cps[start].index, length: end(i) - cps[start].index });
        continue;
      }

      if (selectorByte(cp) !== -1) {
        var from = i, bytes = [];
        while (i < cps.length && selectorByte(cps[i].cp) !== -1 && !keep[cps[i].index]) {
          if (bytes.length < MAX * 4) bytes.push(selectorByte(cps[i].cp));
          i++;
        }
        var decoded = bytes.length >= 2 ? utf8(bytes) : null;
        if (decoded && decoded.trim()) {
          found.push({ kind: 'selector', text: decoded.slice(0, MAX), index: cps[from].index, length: end(i) - cps[from].index });
        }
        continue;
      }
      i++;
    }
    return found;

    function end(k) { return k < cps.length ? cps[k].index : text.length; }
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

  // applyClean(text, {skip, punctuation}) -> cleanWith, then optional punctuation.
  function applyClean(text, opts) {
    opts = opts || {};
    var t = cleanWith(text, opts.skip || null);
    if (opts.punctuation) t = normalizePunctuation(t);
    return t;
  }

  // aiStyle(text) -> visible punctuation people associate with chatbot paste,
  // plus short notes for the invisible characters that actually show up there.
  // This is not an authorship test and it does not see a statistical watermark.
  // Only the narrow no-break space gets a note. The others are already named
  // by the scan, and a second paragraph for each one pushes the preview away.
  var AI_NOTES = {
    0x202F: 'Narrow no-break space. Reported in some 2025 ChatGPT replies. OpenAI said it was a training quirk, not its textGrain watermark.'
  };
  var AI_NOTE_ORDER = [0x202F];

  function aiStyle(text) {
    var punctuation = { emDash: 0, enDash: 0, minus: 0, smartSingle: 0, smartDouble: 0, ellipsis: 0, total: 0 };
    var counts = {};
    if (typeof text !== 'string' || !text) return { punctuation: punctuation, notable: [] };
    for (var idx = 0; idx < text.length; ) {
      var cp = text.codePointAt(idx);
      if (cp === 0x2014 || cp === 0x2015) punctuation.emDash++;
      else if (cp === 0x2013) punctuation.enDash++;
      else if (cp === 0x2212) punctuation.minus++;
      else if (cp === 0x2018 || cp === 0x2019 || cp === 0x201A || cp === 0x201B) punctuation.smartSingle++;
      else if (cp === 0x201C || cp === 0x201D || cp === 0x201E || cp === 0x201F) punctuation.smartDouble++;
      else if (cp === 0x2026) punctuation.ellipsis++;
      if (AI_NOTES[cp]) counts[cp] = (counts[cp] || 0) + 1;
      idx += cp > 0xFFFF ? 2 : 1;
    }
    punctuation.total = punctuation.emDash + punctuation.enDash + punctuation.minus +
      punctuation.smartSingle + punctuation.smartDouble + punctuation.ellipsis;
    var notable = [];
    AI_NOTE_ORDER.forEach(function (cp) {
      if (!counts[cp]) return;
      notable.push({ cp: cp, hex: hex(cp), name: nameOf(cp), count: counts[cp], note: AI_NOTES[cp] });
    });
    return { punctuation: punctuation, notable: notable };
  }

  // --- look-alike letters and hostnames ------------------------------------
  // A curated set, not the whole Unicode confusables list. "spoof" letters are
  // Cyrillic and Greek look-alikes: flagged in a hostname, and in a word only
  // when that word also has a Latin letter (a Russian sentence stays quiet).
  // "compat" letters are fullwidth and mathematical Latin: they are not a
  // language people write prose in, so any token that contains one is flagged.
  // Nothing here is rewritten. Cleaning a look-alike letter would hide the
  // thing the warning is for.
  var SPOOF = {
    0x0430: 'a', 0x0435: 'e', 0x043E: 'o', 0x0440: 'p', 0x0441: 'c', 0x0443: 'y', 0x0445: 'x',
    0x0456: 'i', 0x0455: 's', 0x0458: 'j', 0x043A: 'k', 0x043C: 'm', 0x04CF: 'l',
    0x0410: 'A', 0x0412: 'B', 0x0415: 'E', 0x041A: 'K', 0x041C: 'M', 0x041D: 'H',
    0x041E: 'O', 0x0420: 'P', 0x0421: 'C', 0x0422: 'T', 0x0425: 'X',
    0x0406: 'I', 0x0405: 'S', 0x0408: 'J', 0x04C0: 'I',
    0x0391: 'A', 0x0392: 'B', 0x0395: 'E', 0x0396: 'Z', 0x0397: 'H', 0x0399: 'I',
    0x039A: 'K', 0x039C: 'M', 0x039D: 'N', 0x039F: 'O', 0x03A1: 'P', 0x03A4: 'T',
    0x03A7: 'X', 0x03A5: 'Y', 0x03BF: 'o', 0x03B9: 'i', 0x03C1: 'p'
  };

  function confusable(cp) {
    if (SPOOF[cp]) return { to: SPOOF[cp], kind: 'spoof', name: 'Look-alike ' + SPOOF[cp] };
    if (cp >= 0xFF10 && cp <= 0xFF19) return { to: String.fromCharCode(cp - 0xFF10 + 48), kind: 'compat', name: 'Fullwidth digit' };
    if (cp >= 0xFF21 && cp <= 0xFF3A) return { to: String.fromCharCode(cp - 0xFF21 + 65), kind: 'compat', name: 'Fullwidth Latin letter' };
    if (cp >= 0xFF41 && cp <= 0xFF5A) return { to: String.fromCharCode(cp - 0xFF41 + 97), kind: 'compat', name: 'Fullwidth Latin letter' };
    var math = mathLatin(cp);
    if (math) return { to: math, kind: 'compat', name: 'Mathematical Latin letter' };
    return null;
  }

  // Hole-free mathematical Latin blocks, plus italic (which skips U+1D455).
  function mathLatin(cp) {
    var blocks = [
      [0x1D400, 0x1D41A], [0x1D468, 0x1D482], [0x1D4D0, 0x1D4EA], [0x1D56C, 0x1D586],
      [0x1D5A0, 0x1D5BA], [0x1D5D4, 0x1D5EE], [0x1D608, 0x1D622], [0x1D63C, 0x1D656],
      [0x1D670, 0x1D68A]
    ];
    for (var i = 0; i < blocks.length; i++) {
      if (cp >= blocks[i][0] && cp < blocks[i][0] + 26) return String.fromCharCode(65 + cp - blocks[i][0]);
      if (cp >= blocks[i][1] && cp < blocks[i][1] + 26) return String.fromCharCode(97 + cp - blocks[i][1]);
    }
    if (cp >= 0x1D434 && cp < 0x1D434 + 26) return String.fromCharCode(65 + cp - 0x1D434);
    if (cp >= 0x1D44E && cp <= 0x1D454) return String.fromCharCode(97 + cp - 0x1D44E);
    if (cp === 0x210E) return 'h';
    if (cp >= 0x1D456 && cp <= 0x1D467) return String.fromCharCode(105 + cp - 0x1D456);
    return null;
  }

  function skeletonOf(text) {
    var out = '';
    for (var idx = 0; idx < text.length; ) {
      var cp = text.codePointAt(idx);
      var mapped = confusable(cp);
      out += mapped ? mapped.to : String.fromCodePoint(cp);
      idx += cp > 0xFFFF ? 2 : 1;
    }
    return out;
  }

  // Punycode (RFC 3492) so a hostname warning is the same in Node and Chrome.
  // URL.hostname is punycode in one and Unicode in the other.
  function adaptBias(delta, numPoints, firstTime) {
    delta = firstTime ? Math.floor(delta / 700) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    var k = 0;
    while (delta > 455) {
      delta = Math.floor(delta / 35);
      k += 36;
    }
    return k + Math.floor(36 * delta / (delta + 38));
  }
  function punyDigit(cp) {
    if (cp >= 48 && cp <= 57) return cp - 22;
    if (cp >= 65 && cp <= 90) return cp - 65;
    if (cp >= 97 && cp <= 122) return cp - 97;
    return -1;
  }
  function punyBasic(digit) {
    return digit < 26 ? 97 + digit : 22 + digit;
  }
  function punyDecode(input) {
    if (typeof input !== 'string' || !input) return '';
    input = input.toLowerCase();
    var output = [], n = 128, i = 0, bias = 72;
    var delim = input.lastIndexOf('-');
    var pos = 0;
    if (delim > 0) {
      for (var j = 0; j < delim; j++) {
        var basic = input.charCodeAt(j);
        if (basic >= 128) return null;
        output.push(basic);
      }
      pos = delim + 1;
    }
    while (pos < input.length) {
      var oldi = i, w = 1, k = 36;
      while (true) {
        if (pos >= input.length) return null;
        var digit = punyDigit(input.charCodeAt(pos++));
        if (digit < 0 || digit > Math.floor((0x7fffffff - i) / w)) return null;
        i += digit * w;
        var t = k <= bias ? 1 : (k >= bias + 26 ? 26 : k - bias);
        if (digit < t) break;
        if (w > Math.floor(0x7fffffff / (36 - t))) return null;
        w *= 36 - t;
        k += 36;
      }
      var outLen = output.length + 1;
      bias = adaptBias(i - oldi, outLen, oldi === 0);
      if (Math.floor(i / outLen) > 0x10ffff - n) return null;
      n += Math.floor(i / outLen);
      i %= outLen;
      output.splice(i, 0, n);
      i++;
    }
    return output.map(function (cp) { return String.fromCodePoint(cp); }).join('');
  }
  function punyEncode(input) {
    if (typeof input !== 'string') return null;
    var output = [], cps = [];
    for (var idx = 0; idx < input.length; ) {
      var cp = input.codePointAt(idx);
      cps.push(cp);
      if (cp < 128) output.push(String.fromCharCode(cp));
      idx += cp > 0xFFFF ? 2 : 1;
    }
    var basicLen = output.length;
    if (basicLen === cps.length) return output.join('');
    if (basicLen) output.push('-');
    var n = 128, delta = 0, bias = 72, handled = basicLen;
    while (handled < cps.length) {
      var m = 0x110000;
      for (var q = 0; q < cps.length; q++) if (cps[q] >= n && cps[q] < m) m = cps[q];
      if ((m - n) > Math.floor((0x7fffffff - delta) / (handled + 1))) return null;
      delta += (m - n) * (handled + 1);
      n = m;
      for (var r = 0; r < cps.length; r++) {
        if (cps[r] < n) {
          if (delta === 0x7fffffff) return null;
          delta++;
        } else if (cps[r] === n) {
          var qq = delta, k = 36;
          while (true) {
            var t = k <= bias ? 1 : (k >= bias + 26 ? 26 : k - bias);
            if (qq < t) break;
            output.push(String.fromCharCode(punyBasic(t + ((qq - t) % (36 - t)))));
            qq = Math.floor((qq - t) / (36 - t));
            k += 36;
          }
          output.push(String.fromCharCode(punyBasic(qq)));
          bias = adaptBias(delta, handled + 1, handled === basicLen);
          delta = 0;
          handled++;
        }
      }
      delta++;
      n++;
    }
    return output.join('');
  }

  function asciiHost(unicodeHost) {
    return unicodeHost.split('.').map(function (label) {
      if (!label) return label;
      if (/^xn--/i.test(label)) return label.toLowerCase();
      if (/[^\u0000-\u007F]/.test(label)) {
        var enc = punyEncode(label);
        return enc && enc !== label ? 'xn--' + enc : label;
      }
      return label.toLowerCase();
    }).join('.');
  }

  function inspectHostname(hostname) {
    var display = [], ascii = [], letters = [];
    hostname.split('.').forEach(function (label) {
      var unicode = label, asciiLabel = label.toLowerCase();
      if (/^xn--/i.test(label)) {
        var dec = punyDecode(label.slice(4));
        if (dec) unicode = dec;
        asciiLabel = label.toLowerCase();
      } else if (/[^\u0000-\u007F]/.test(label)) {
        unicode = label;
        asciiLabel = asciiHost(label);
      }
      display.push(unicode);
      ascii.push(asciiLabel);
      for (var idx = 0; idx < unicode.length; ) {
        var cp = unicode.codePointAt(idx);
        var mapped = confusable(cp);
        if (mapped) letters.push({ cp: cp, hex: hex(cp), name: mapped.name, looksLike: mapped.to });
        idx += cp > 0xFFFF ? 2 : 1;
      }
    });
    var host = display.join('.');
    return { host: host, ascii: ascii.join('.'), skeleton: skeletonOf(host), letters: letters };
  }

  function hostnameFrom(raw) {
    var s = raw;
    if (!/^https?:\/\//i.test(s)) {
      if (!/^[^\s/]+$/.test(s)) return null;
      s = 'http://' + s;
    }
    try {
      var host = new URL(s).hostname;
      if (!host || host.indexOf('.') < 0 || host.indexOf(':') !== -1) return null;
      return host;
    } catch (e) { return null; }
  }

  function wordHits(word) {
    var hasLatin = false, spoof = [], compat = [];
    for (var idx = 0; idx < word.length; ) {
      var cp = word.codePointAt(idx);
      if ((cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122)) hasLatin = true;
      var mapped = confusable(cp);
      if (mapped) {
        var hit = { cp: cp, indexInWord: idx, hex: hex(cp), name: mapped.name, looksLike: mapped.to, kind: mapped.kind };
        if (mapped.kind === 'compat') compat.push(hit);
        else spoof.push(hit);
      }
      idx += cp > 0xFFFF ? 2 : 1;
    }
    return hasLatin ? compat.concat(spoof) : compat;
  }

  // homoglyphs(text) -> {findings, urls}. findings are look-alike letters in
  // words. urls are hostnames whose labels use those letters. Overlap with a
  // flagged hostname is left to the url entry so the warning is not repeated.
  function homoglyphs(text) {
    var findings = [], urls = [];
    if (typeof text !== 'string' || !text) return { findings: findings, urls: urls };
    var covered = [];
    function consider(raw, index) {
      if (urls.length >= 20) return;
      var host = hostnameFrom(raw);
      if (!host) return;
      var info = inspectHostname(host);
      if (!info.letters.length) return;
      for (var c = 0; c < covered.length; c++) {
        if (index >= covered[c].start && index < covered[c].end) return;
      }
      covered.push({ start: index, end: index + raw.length });
      urls.push({
        index: index,
        raw: raw.slice(0, 180),
        host: info.host,
        ascii: info.ascii,
        skeleton: info.skeleton,
        letters: info.letters.slice(0, 12)
      });
    }
    function collect(re) {
      re.lastIndex = 0;
      var m;
      while ((m = re.exec(text))) {
        var raw = m[0].replace(/[.,);:!?'"\]]+$/g, '');
        if (raw) consider(raw, m.index);
      }
    }
    collect(/(?:https?:\/\/|www\.)[^\s<>"'`]+/gi);
    collect(/(?:[a-z0-9-]{1,63}\.)*xn--[a-z0-9-]{1,59}(?:\.[a-z0-9-]{2,63})+/gi);
    collect(/[\p{L}\p{N}][\p{L}\p{N}-]{0,62}(?:\.[\p{L}\p{N}][\p{L}\p{N}-]{0,62})+/gu);

    var wordRe = /[\p{L}\p{N}]+/gu, w;
    while ((w = wordRe.exec(text))) {
      if (findings.length >= 50) break;
      var inside = false;
      for (var c = 0; c < covered.length; c++) {
        if (w.index >= covered[c].start && w.index < covered[c].end) { inside = true; break; }
      }
      if (inside) continue;
      var hits = wordHits(w[0]);
      var skel = hits.length ? skeletonOf(w[0]) : '';
      for (var h = 0; h < hits.length && findings.length < 50; h++) {
        findings.push({
          index: w.index + hits[h].indexInWord,
          cp: hits[h].cp,
          hex: hits[h].hex,
          name: hits[h].name,
          looksLike: hits[h].looksLike,
          kind: hits[h].kind,
          word: w[0].slice(0, 80),
          wordIndex: w.index,
          wordSkeleton: skel.slice(0, 80)
        });
      }
    }
    return { findings: findings, urls: urls };
  }

  // reviewCode(text) -> Trojan Source review of pasted source or a unified diff.
  // Bidirectional overrides and isolates are reported on every line. Invisible
  // characters and look-alike letters are reported on added diff lines and on
  // lines that look like code. Directional marks in ordinary prose are left
  // alone: Hebrew and Arabic use them on purpose.
  function looksLikeCode(line) {
    return /[{};]|=>|==|::|\b(function|const|let|var|class|def|import|return|if|for|while)\b|#include|\b(public|private|fn|func)\b/.test(line);
  }

  function reviewCode(text) {
    var empty = { verdict: 'clean', diff: false, scannedLines: 0, findings: [] };
    if (typeof text !== 'string' || !text) return empty;
    var lines = text.split('\n');
    var diff = false;
    for (var d = 0; d < lines.length; d++) {
      var probe = lines[d].charAt(lines[d].length - 1) === '\r' ? lines[d].slice(0, -1) : lines[d];
      if (probe.indexOf('diff --git ') === 0 || probe.indexOf('@@') === 0 ||
          probe.indexOf('+++ ') === 0 || probe.indexOf('--- ') === 0) {
        diff = true;
        break;
      }
    }
    var findings = [];
    var OPEN_PDF = { 0x202A: 1, 0x202B: 1, 0x202D: 1, 0x202E: 1 };
    var OPEN_PDI = { 0x2066: 1, 0x2067: 1, 0x2068: 1 };
    lines.forEach(function (rawLine, lineIndex) {
      if (findings.length >= 30) return;
      var line = rawLine.charAt(rawLine.length - 1) === '\r' ? rawLine.slice(0, -1) : rawLine;
      var added = line.charAt(0) === '+' && line.indexOf('+++') !== 0;
      var content = added ? line.slice(1) : line;
      // In a diff, only added lines are reviewed as code. A removed line can
      // look like code and still be the old text, which is not the change.
      var codeLine = diff ? added : looksLikeCode(content);
      var pdfOpen = 0, pdfClose = 0, pdiOpen = 0, pdiClose = 0, firstOpen = 0;
      for (var idx = 0; idx < line.length && findings.length < 30; ) {
        var cp = line.codePointAt(idx);
        var c = classify(cp);
        if (c && c.category === 'bidi') {
          var mark = cp === 0x200E || cp === 0x200F || cp === 0x061C;
          if (!mark) {
            findings.push({
              line: lineIndex + 1,
              column: idx + 1,
              severity: 'high',
              kind: 'bidi',
              hex: hex(cp),
              name: nameOf(cp),
              message: 'Bidirectional control. Display order can differ from stored order (Trojan Source).'
            });
          } else if (codeLine) {
            findings.push({
              line: lineIndex + 1,
              column: idx + 1,
              severity: 'medium',
              kind: 'bidi-mark',
              hex: hex(cp),
              name: nameOf(cp),
              message: 'Directional mark in code. It can nudge the display order of this line.'
            });
          }
        } else if (c && codeLine && findings.length < 30) {
          findings.push({
            line: lineIndex + 1,
            column: idx + 1,
            severity: c.category === 'space' ? 'medium' : 'high',
            kind: c.category,
            hex: hex(cp),
            name: nameOf(cp),
            message: c.category === 'space'
              ? 'Look-alike space in code. It is not the space the eye expects.'
              : 'Invisible character in code. Two names can look the same and compare different.'
          });
        }
        if (OPEN_PDF[cp]) { pdfOpen++; if (!firstOpen) firstOpen = idx + 1; }
        else if (cp === 0x202C) pdfClose++;
        else if (OPEN_PDI[cp]) { pdiOpen++; if (!firstOpen) firstOpen = idx + 1; }
        else if (cp === 0x2069) pdiClose++;
        idx += cp > 0xFFFF ? 2 : 1;
      }
      if ((pdfOpen > pdfClose || pdiOpen > pdiClose) && findings.length < 30) {
        findings.push({
          line: lineIndex + 1,
          column: firstOpen || 1,
          severity: 'high',
          kind: 'bidi-unterminated',
          hex: '',
          name: 'Unclosed bidirectional control',
          message: 'A bidirectional opener on this line is not closed, so the display order can stay flipped.'
        });
      }
      if (codeLine && findings.length < 30) {
        var seenWord = {};
        homoglyphs(content).findings.forEach(function (hit) {
          if (findings.length >= 30 || seenWord[hit.wordIndex]) return;
          seenWord[hit.wordIndex] = true;
          findings.push({
            line: lineIndex + 1,
            column: (added ? 1 : 0) + hit.index + 1,
            severity: 'high',
            kind: 'homoglyph',
            hex: hit.hex,
            name: hit.name,
            message: 'Look-alike letter ' + hit.hex + '. The word resembles "' + hit.wordSkeleton + '", and it is not that spelling.'
          });
        });
      }
    });
    var verdict = 'clean';
    for (var f = 0; f < findings.length; f++) {
      if (findings[f].severity === 'high') { verdict = 'block'; break; }
      verdict = 'review';
    }
    return { verdict: verdict, diff: diff, scannedLines: lines.length, findings: findings };
  }

  return {
    scan: scan,
    clean: clean,
    cleanWith: cleanWith,
    applyClean: applyClean,
    visualize: visualize,
    normalizePunctuation: normalizePunctuation,
    aiStyle: aiStyle,
    homoglyphs: homoglyphs,
    reviewCode: reviewCode,
    classify: classify,
    emojiParts: emojiParts,
    decodeHidden: decodeHidden,
    nameOf: nameOf,
    hex: hex,
    CATEGORIES: CATEGORIES,
    VERSION: '2.0.0'
  };
});
