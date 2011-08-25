/*
  IE7/IE8/IE9.js - copyright 2004-2010, Dean Edwards
  http://code.google.com/p/ie7-js/
  http://www.opensource.org/licenses/mit-license.php
*/

/* W3C compliance for Microsoft Internet Explorer */

/* credits/thanks:
  Shaggy, Martijn Wargers, Jimmy Cerra, Mark D Anderson,
  Lars Dieckow, Erik Arvidsson, Gellért Gyuris, James Denny,
  Unknown W Brackets, Benjamin Westfarer, Rob Eberhardt,
  Bill Edney, Kevin Newman, James Crompton, Matthew Mastracci,
  Doug Wright, Richard York, Kenneth Kolano, MegaZone,
  Thomas Verelst, Mark 'Tarquin' Wilton-Jones, Rainer Åhlfors,
  David Zulaica, Ken Kolano, Kevin Newman, Sjoerd Visscher,
  Ingo Chao
*/

// timestamp: Fri, 30 Apr 2010 20:59:18

(function(window, document) {

	var IE7 = window.IE7 = {
	  version: "2.1(beta4)",
	  toString: K("[IE7]")
	};
	IE7.compat = 8;
	var appVersion = IE7.appVersion = navigator.appVersion.match(/MSIE (\d\.\d)/)[1] - 0;
	
	if (/ie7_off/.test(top.location.search) || appVersion < 5.5 || appVersion >= IE7.compat) return;
	
	var MSIE5 = appVersion < 6;
	
	var Undefined = K();
	var documentElement = document.documentElement, body, viewport;
	var ANON = "!";
	var HEADER = ":link{ie7-link:link}:visited{ie7-link:visited}";
	
	// -----------------------------------------------------------------------
	// external
	// -----------------------------------------------------------------------
	
	var RELATIVE = /^[\w\.]+[^:]*$/;
	function makePath(href, path) {
	  if (RELATIVE.test(href)) href = (path || "") + href;
	  return href;
	}
	
	function getPath(href, path) {
	  href = makePath(href, path);
	  return href.slice(0, href.lastIndexOf("/") + 1);
	}
	
	// Get the path to this script
	var script = document.scripts[document.scripts.length - 1];
	var path = getPath(script.src);
	
	// Use microsoft's http request object to load external files
	try {
	  var httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
	} catch (ex) {
	  // ActiveX disabled
	}
	
	var fileCache = {};
	function loadFile(href, path) {
	  try {
	    href = makePath(href, path);
	    if (!fileCache[href]) {
	      httpRequest.open("GET", href, false);
	      httpRequest.send();
	      if (httpRequest.status == 0 || httpRequest.status == 200) {
	        fileCache[href] = httpRequest.responseText;
	      }
	    }
	  } catch (ex) {
	    // ignore errors
	  }
	  return fileCache[href] || "";
	}
	
	// -----------------------------------------------------------------------
	// OO support
	// -----------------------------------------------------------------------
	
	
	// This is a cut-down version of base2 (http://code.google.com/p/base2/)
	
	var _slice = Array.prototype.slice;
	
	// private
	var _FORMAT = /%([1-9])/g;
	var _LTRIM = /^\s\s*/;
	var _RTRIM = /\s\s*$/;
	var _RESCAPE = /([\/()[\]{}|*+-.,^$?\\])/g;           // safe regular expressions
	var _BASE = /\bbase\b/;
	var _HIDDEN = ["constructor", "toString"];            // only override these when prototyping
	
	var prototyping;
	
	function Base(){}
	Base.extend = function(_instance, _static) {
	  // Build the prototype.
	  prototyping = true;
	  var _prototype = new this;
	  extend(_prototype, _instance);
	  prototyping = false;
	
	  // Create the wrapper for the constructor function.
	  var _constructor = _prototype.constructor;
	  function klass() {
	    // Don't call the constructor function when prototyping.
	    if (!prototyping) _constructor.apply(this, arguments);
	  }
	  _prototype.constructor = klass;
	
	  // Build the static interface.
	  klass.extend = arguments.callee;
	  extend(klass, _static);
	  klass.prototype = _prototype;
	  return klass;
	};
	Base.prototype.extend = function(source) {
	  return extend(this, source);
	};
	
	
	// A collection of regular expressions and their associated replacement values.
	// A Base class for creating parsers.
	
	var HASH     = "#";
	var ITEMS    = "#";
	var KEYS     = ".";
	var COMPILED = "/";
	
	var REGGRP_BACK_REF        = /\\(\d+)/g,
	    REGGRP_ESCAPE_COUNT    = /\[(\\.|[^\]\\])+\]|\\.|\(\?/g,
	    REGGRP_PAREN           = /\(/g,
	    REGGRP_LOOKUP          = /\$(\d+)/,
	    REGGRP_LOOKUP_SIMPLE   = /^\$\d+$/,
	    REGGRP_LOOKUPS         = /(\[(\\.|[^\]\\])+\]|\\.|\(\?)|\(/g,
	    REGGRP_DICT_ENTRY      = /^<#\w+>$/,
	    REGGRP_DICT_ENTRIES    = /<#(\w+)>/g;
	
	var RegGrp = Base.extend({
	  constructor: function(values) {
	    this[KEYS] = [];
	    this[ITEMS] = {};
	    this.merge(values);
	  },
	
	  //dictionary: null,
	  //ignoreCase: false,
	
	  add: function(expression, replacement) {
	    delete this[COMPILED];
	    if (expression instanceof RegExp) {
	      expression = expression.source;
	    }
	    if (!this[HASH + expression]) this[KEYS].push(String(expression));
	    return this[ITEMS][HASH + expression] = new RegGrp.Item(expression, replacement, this);
	  },
	
	  compile: function(recompile) {
	    if (recompile || !this[COMPILED]) {
	      this[COMPILED] = new RegExp(this, this.ignoreCase ? "gi" : "g");
	    }
	    return this[COMPILED];
	  },
	
	  merge: function(values) {
	    for (var i in values) this.add(i, values[i]);
	  },
	
	  exec: function(string) {
	    var group = this,
	        patterns = group[KEYS],
	        items = group[ITEMS], item;
	    var result = this.compile(true).exec(string);
	    if (result) {
	      // Loop through the RegGrp items.
	      var i = 0, offset = 1;
	      while ((item = items[HASH + patterns[i++]])) {
	        var next = offset + item.length + 1;
	        if (result[offset]) { // do we have a result?
	          if (item.replacement === 0) {
	            return group.exec(string);
	          } else {
	            var args = result.slice(offset, next), j = args.length;
	            while (--j) args[j] = args[j] || ""; // some platforms return null/undefined for non-matching sub-expressions
	            args[0] = {match: args[0], item: item};
	            return args;
	          }
	        }
	        offset = next;
	      }
	    }
	    return null;
	  },
	
	  parse: function(string) {
	    string += ""; // type safe
	    var group = this,
	        patterns = group[KEYS],
	        items = group[ITEMS];
	    return string.replace(this.compile(), function(match) {
	      var args = [], item, offset = 1, i = arguments.length;
	      while (--i) args[i] = arguments[i] || ""; // some platforms return null/undefined for non-matching sub-expressions
	      // Loop through the RegGrp items.
	      while ((item = items[HASH + patterns[i++]])) {
	        var next = offset + item.length + 1;
	        if (args[offset]) { // do we have a result?
	          var replacement = item.replacement;
	          switch (typeof replacement) {
	            case "function":
	              return replacement.apply(group, args.slice(offset, next));
	            case "number":
	              return args[offset + replacement];
	            default:
	              return replacement;
	          }
	        }
	        offset = next;
	      }
	      return match;
	    });
	  },
	
	  toString: function() {
	    var strings = [],
	        keys = this[KEYS],
	        items = this[ITEMS], item;
	    for (var i = 0; item = items[HASH + keys[i]]; i++) {
	      strings[i] = item.source;
	    }
	    return "(" + strings.join(")|(") + ")";
	  }
	}, {
	  IGNORE: null, // a null replacement value means that there is no replacement.
	
	  Item: Base.extend({
	    constructor: function(source, replacement, owner) {
	      var length = source.indexOf("(") === -1 ? 0 : RegGrp.count(source);
	
	      var dictionary = owner.dictionary;
	      if (dictionary && source.indexOf("<#") !== -1) {
	        if (REGGRP_DICT_ENTRY.test(source)) {
	          var entry = dictionary[ITEMS][HASH + source.slice(2, -1)];
	          source = entry.replacement;
	          length = entry._length;
	        } else {
	          source = dictionary.parse(source);
	        }
	      }
	
	      if (typeof replacement == "number") replacement = String(replacement);
	      else if (replacement == null) replacement = 0;
	
	      // Does the expression use sub-expression lookups?
	      if (typeof replacement == "string" && REGGRP_LOOKUP.test(replacement)) {
	        if (REGGRP_LOOKUP_SIMPLE.test(replacement)) { // A simple lookup? (e.g. "$2").
	          // Store the index (used for fast retrieval of matched strings).
	          var index = replacement.slice(1) - 0;
	          if (index && index <= length) replacement = index;
	        } else {
	          // A complicated lookup (e.g. "Hello $2 $1.").
	          var lookup = replacement, regexp;
	          replacement = function(match) {
	            if (!regexp) {
	              regexp = new RegExp(source, "g" + (this.ignoreCase ? "i": ""));
	            }
	            return match.replace(regexp, lookup);
	          };
	        }
	      }
	
	      this.length = length;
	      this.source = String(source);
	      this.replacement = replacement;
	    }
	  }),
	
	  count: function(expression) {
	    return (String(expression).replace(REGGRP_ESCAPE_COUNT, "").match(REGGRP_PAREN) || "").length;
	  }
	});
	
	var Dictionary = RegGrp.extend({
	  parse: function(phrase) {
	    // Prevent sub-expressions in dictionary entries from capturing.
	    var entries = this[ITEMS];
	    return phrase.replace(REGGRP_DICT_ENTRIES, function(match, entry) {
	      entry = entries[HASH + entry];
	      return entry ? entry._nonCapturing : match;
	    });
	  },
	
	  add: function(expression, replacement) {
	    // Get the underlying replacement value.
	    if (replacement instanceof RegExp) {
	      replacement = replacement.source;
	    }
	    // Translate the replacement.
	    // The result is the original replacement recursively parsed by this dictionary.
	    var nonCapturing = replacement.replace(REGGRP_LOOKUPS, _nonCapture);
	    if (replacement.indexOf("(") !== -1) {
	      var realLength = RegGrp.count(replacement);
	    }
	    if (replacement.indexOf("<#") !== -1) {
	      replacement = this.parse(replacement);
	      nonCapturing = this.parse(nonCapturing);
	    }
	    var item = this.base(expression, replacement);
	    item._nonCapturing = nonCapturing;
	    item._length = realLength || item.length; // underlying number of sub-groups
	    return item;
	  },
	
	  toString: function() {
	    return "(<#" + this[PATTERNS].join(">)|(<#") + ">)";
	  }
	});
	
	function _nonCapture(match, escaped) {
	  return escaped || "(?:"; // non-capturing
	};
	
	// =========================================================================
	// lang/extend.js
	// =========================================================================
	
	function extend(object, source) { // or extend(object, key, value)
	  if (object && source) {
	    var proto = (typeof source == "function" ? Function : Object).prototype;
	    // Add constructor, toString etc
	    var i = _HIDDEN.length, key;
	    if (prototyping) while (key = _HIDDEN[--i]) {
	      var value = source[key];
	      if (value != proto[key]) {
	        if (_BASE.test(value)) {
	          _override(object, key, value)
	        } else {
	          object[key] = value;
	        }
	      }
	    }
	    // Copy each of the source object's properties to the target object.
	    for (key in source) if (typeof proto[key] == "undefined") {
	      var value = source[key];
	      // Check for method overriding.
	      if (object[key] && typeof value == "function" && _BASE.test(value)) {
	        _override(object, key, value);
	      } else {
	        object[key] = value;
	      }
	    }
	  }
	  return object;
	};
	
	function _override(object, name, method) {
	  // Override an existing method.
	  var ancestor = object[name];
	  object[name] = function() {
	    var previous = this.base;
	    this.base = ancestor;
	    var returnValue = method.apply(this, arguments);
	    this.base = previous;
	    return returnValue;
	  };
	};
	
	function combine(keys, values) {
	  // Combine two arrays to make a hash.
	  if (!values) values = keys;
	  var hash = {};
	  for (var i in keys) hash[i] = values[i];
	  return hash;
	};
	
	function format(string) {
	  // Replace %n with arguments[n].
	  // e.g. format("%1 %2%3 %2a %1%3", "she", "se", "lls");
	  // ==> "she sells sea shells"
	  // Only %1 - %9 supported.
	  var args = arguments;
	  var _FORMAT = new RegExp("%([1-" + arguments.length + "])", "g");
	  return String(string).replace(_FORMAT, function(match, index) {
	    return index < args.length ? args[index] : match;
	  });
	};
	
	function match(string, expression) {
	  // Same as String.match() except that this function will return an empty
	  // array if there is no match.
	  return String(string).match(expression) || [];
	};
	
	// http://blog.stevenlevithan.com/archives/faster-trim-javascript
	function trim(string) {
	  return String(string).replace(_LTRIM, "").replace(_RTRIM, "");
	};
	
	function K(k) {
	  return function() {
	    return k;
	  };
	};
	
	// -----------------------------------------------------------------------
	// parsing
	// -----------------------------------------------------------------------
	
	var Parser = RegGrp.extend({ignoreCase: true});
	
	var SINGLE_QUOTES       = /'/g,
	    ESCAPED             = /'(\d+)'/g,
	    ESCAPE              = /\\/g,
	    UNESCAPE            = /\\([nrtf'"])/g;
	
	var strings = [];
	
	var encoder = new Parser({
	  // comments
	  "<!\\-\\-|\\-\\->": "",
	  "\\/\\*[^*]*\\*+([^\\/][^*]*\\*+)*\\/": "",
	  // get rid
	  "@(namespace|import)[^;\\n]+[;\\n]": "",
	  // strings
	  "'(\\\\.|[^'\\\\])*'": encodeString,
	  '"(\\\\.|[^"\\\\])*"': encodeString,
	  // white space
	  "\\s+": " "
	});
	
	function encode(selector) {
	  return encoder.parse(selector).replace(UNESCAPE, "$1");
	};
	
	function decode(query) {
	  // put string values back
	  return query.replace(ESCAPED, decodeString);
	};
	
	function encodeString(string) {
	  var index = strings.length;
	  strings[index] = string.slice(1, -1)
	    .replace(UNESCAPE, "$1")
	    .replace(SINGLE_QUOTES, "\\'");
	  return "'" + index + "'";
	};
	
	function decodeString(match, index) {
	  var string = strings[index];
	  if (string == null) return match;
	  return "'" + strings[index] + "'";
	};
	
	function getString(value) {
	  return value.indexOf("'") === 0 ? strings[value.slice(1, - 1)] : value;
	};
	
	// -----------------------------------------------------------------------
	// generic
	// -----------------------------------------------------------------------
	
	var $IE7 = "ie7-";
	
	var Fix = Base.extend({
	  constructor: function() {
	    this.fixes = [];
	    this.recalcs = [];
	  },
	  init: Undefined
	});
	
	// a store for functions that will be called when refreshing IE7
	var recalcs = [];
	function addRecalc(recalc) {
	  recalcs.push(recalc);
	};
	
	IE7.recalc = function() {
	  // re-apply style sheet rules (re-calculate ie7 classes)
	  IE7.CSS.recalc();
	  // apply global fixes to the document
	  for (var i = 0; i < recalcs.length; i++) recalcs[i]();
	};
	
	
	// =========================================================================
	// ie7-css.js
	// =========================================================================
	
	var NEXT_SIBLING        = "(e.nextSibling&&IE7._getElementSibling(e,'next'))",
	    PREVIOUS_SIBLING    = NEXT_SIBLING.replace(/next/g, "previous"),
	    IS_ELEMENT          = "e.nodeName>'@'",
	    IF_ELEMENT          = "if(" + IS_ELEMENT + "){";
	
	var ID_ATTRIBUTE  = "(e.nodeName==='FORM'?IE7._getAttribute(e,'id'):e.id)";
	
	var HYPERLINK = /a(#[\w-]+)?(\.[\w-]+)?:(hover|active)/i;
	var FIRST_LINE_LETTER = /(.*)(:first-(line|letter))/;
	var SPACE = /\s/;
	var RULE = /((?:\\.|[^{\\])+)\{((?:\\.|[^}\\])+)\}/g;
	var SELECTOR = /(?:\\.|[^,\\])+/g;
	
	var styleSheets = document.styleSheets;
	
	var inheritedProperties = [];
	
	IE7.CSS = new (Fix.extend({ // single instance
	  parser: new Parser,
	  screen: "",
	  print: "",
	  styles: [],
	  rules: [],
	  pseudoClasses: appVersion < 7 ? "first\\-child" : "",
	  dynamicPseudoClasses: {
	    toString: function() {
	      var strings = [];
	      for (var pseudoClass in this) strings.push(pseudoClass);
	      return strings.join("|");
	    }
	  },
	  
	  init: function() {
	    var NONE = "^\x01$";
	    var CLASS = "\\[class=?[^\\]]*\\]";
	    var pseudoClasses = [];
	    if (this.pseudoClasses) pseudoClasses.push(this.pseudoClasses);
	    var dynamicPseudoClasses = this.dynamicPseudoClasses.toString(); 
	    if (dynamicPseudoClasses) pseudoClasses.push(dynamicPseudoClasses);
	    pseudoClasses = pseudoClasses.join("|");
	    var unknown = appVersion < 7 ? ["[>+~\\[(]|([:.])[\\w-]+\\1"] : [CLASS];
	    if (pseudoClasses) unknown.push(":(" + pseudoClasses + ")");
	    this.UNKNOWN = new RegExp(unknown.join("|") || NONE, "i");
	    var complex = appVersion < 7 ? ["\\[[^\\]]+\\]|[^\\s(\\[]+\\s*[+~]"] : [CLASS];
	    var complexRule = complex.concat();
	    if (pseudoClasses) complexRule.push(":(" + pseudoClasses + ")");
	    Rule.COMPLEX = new RegExp(complexRule.join("|") || NONE, "ig");
	    if (this.pseudoClasses) complex.push(":(" + this.pseudoClasses + ")");
	    //DynamicRule.COMPLEX = new RegExp(complex.join("|") || NONE, "i");
	    dynamicPseudoClasses = "not\\(:" + dynamicPseudoClasses.split("|").join("\\)|not\\(:") + "\\)|" + dynamicPseudoClasses;
	    //DynamicRule.MATCH = new RegExp(dynamicPseudoClasses ? "(.*?):(" + dynamicPseudoClasses + ")(.*)" : NONE, "i");
	    
	    this.createStyleSheet();
	    this.refresh();
	  },
	  
	  addFix: function(expression, replacement) {
	    this.parser.add(expression, replacement);
	  },
	  
	  addRecalc: function(propertyName, test, handler, replacement) {
	    // recalcs occur whenever the document is refreshed using document.recalc()
	    propertyName = propertyName.source || propertyName;
	    test = new RegExp("([{;\\s])" + propertyName + "\\s*:\\s*" + test + "[^;}]*");
	    var id = this.recalcs.length;
	    if (typeof replacement == "string") replacement = propertyName + ":" + replacement;
	    this.addFix(test, function(match) {
	      if (typeof replacement == "function") replacement = replacement(match);
	      return (replacement ? replacement : match) + ";ie7-" + match.slice(1) + ";ie7_recalc" + id + ":1";
	    });
	    this.recalcs.push(arguments);
	    return id;
	  },
	  
	  apply: function() {
	    this.getInlineCSS();
	    new StyleSheet("screen");
	    this.trash();
	  },
	  
	  createStyleSheet: function() {
	    // create the IE7 style sheet
	    document.getElementsByTagName("head")[0].appendChild(document.createElement("style"));
	    this.styleSheet = styleSheets[styleSheets.length - 1];
	    // flag it so we can ignore it during parsing
	    this.styleSheet.ie7 = true;
	    this.styleSheet.owningElement.ie7 = true;
	    this.styleSheet.cssText = HEADER;
	  },
	  
	  getInlineCSS: function() {// load inline styles
	    var styleSheets = document.getElementsByTagName("style"), styleSheet;
	    for (var i = styleSheets.length - 1; styleSheet = styleSheets[i]; i--) {
	      if (!styleSheet.disabled && !styleSheet.ie7) {
	        styleSheet._cssText = styleSheet.innerHTML;
	      }
	    }
	  },
	  
	  getText: function(styleSheet, path) {
	    // Internet Explorer will trash unknown selectors (it converts them to "UNKNOWN").
	    // So we must reload external style sheets (internal style sheets can have their text
	    // extracted through the innerHTML property).
	
	    // load the style sheet text from an external file
	    try {
	      var cssText = styleSheet.cssText;
	    } catch (e) {
	      cssText = "";
	    }
	    if (httpRequest) cssText = loadFile(styleSheet.href, path) || cssText;
	    return cssText;
	  },
	  
	  recalc: function() {
	    this.screen.recalc();
	    // we're going to read through all style rules.
	    //  certain rules have had ie7 properties added to them.
	    //   e.g. p{top:0; ie7_recalc2:1; left:0}
	    //  this flags a property in the rule as needing a fix.
	    //  the selector text is then used to query the document.
	    //  we can then loop through the results of the query
	    //  and fix the elements.
	    // we ignore the IE7 rules - so count them in the header
	    var RECALCS = /ie7_recalc\d+/g;
	    var start = HEADER.match(/[{,]/g).length;
	    // only calculate screen fixes. print fixes don't show up anyway
	    var rules = this.styleSheet.rules, rule;
	    var calcs, calc, elements, element, i, j, k, id;
	    // loop through all rules
	    for (i = start; rule = rules[i]; i++) {
	      var cssText = rule.style.cssText;
	      // search for the "ie7_recalc" flag (there may be more than one)
	      if (calcs = cssText.match(RECALCS)) {
	        // use the selector text to query the document
	        elements = cssQuery(rule.selectorText);
	        // if there are matching elements then loop
	        //  through the recalc functions and apply them
	        //  to each element
	        if (elements.length) for (j = 0; j < calcs.length; j++) {
	          // get the matching flag (e.g. ie7_recalc3)
	          id = calcs[j];
	          // extract the numeric id from the end of the flag
	          //  and use it to index the collection of recalc
	          //  functions
	          calc = IE7.CSS.recalcs[id.slice(10)][2];
	          for (k = 0; (element = elements[k]); k++) {
	            // apply the fix
	            if (element.currentStyle[id]) calc(element, cssText);
	          }
	        }
	      }
	    }
	  },
	  
	  refresh: function() {
	    this.styleSheet.cssText = HEADER + this.screen + this.print;
	  },
	  
	  trash: function() {
	    // trash the old style sheets
	    for (var i = 0; i < styleSheets.length; i++) {
	      if (!styleSheets[i].ie7) {
	        try {
	          var cssText = styleSheets[i].cssText;
	        } catch (e) {
	          cssText = "";
	        }
	        if (cssText) styleSheets[i].cssText = "";
	      }
	    }
	  }
	}));
	
	// -----------------------------------------------------------------------
	//  IE7 StyleSheet class
	// -----------------------------------------------------------------------
	
	var StyleSheet = Base.extend({
	  constructor: function(media) {
	    this.media = media;
	    this.load();
	    IE7.CSS[media] = this;
	    IE7.CSS.refresh();
	  },
	  
	  createRule: function(selector, cssText) {
	    var match;
	    if (PseudoElement && (match = selector.match(PseudoElement.MATCH))) {
	      return new PseudoElement(match[1], match[2], cssText);
	    } else {
	      return new Rule(selector, cssText);
	    }
	    return selector + " {" + cssText + "}";
	  },
	  
	  getText: function() {
	    // store for style sheet text
	    // parse media decalarations
	    var MEDIA        = /@media\s+([^{]+?)\s*\{([^@]+\})\s*\}/gi;
	    var IMPORTS      = /@import[^;\n]+/gi;
	    var TRIM_IMPORTS = /@import\s+url\s*\(\s*["']?|["']?\s*\)\s*/gi;
	    var URL          = /(url\s*\(\s*['"]?)([\w\.]+[^:\)]*['"]?\))/gi;
	
	    var self = this;
	    
	    // Store loaded cssText URLs
	    var fileCache = {};
	    
	    function getCSSText(styleSheet, path, media, level) {
	      var cssText = "";
	      if (!level) {
	        media = toSimpleMedia(styleSheet.media);
	        level = 0;
	      }
	      if (media === "none") {
	        styleSheet.disabled = true;
	        return "";
	      }
	      if (media === "all" || media === self.media) {
	        // IE only allows importing style sheets three levels deep.
	        // it will crash if you try to access a level below this
	        try {
	          var canAcess = !!styleSheet.cssText;
	        } catch (exe) {}
	        if (level < 3 && canAcess) {
	          var hrefs = styleSheet.cssText.match(IMPORTS);
	          // loop through imported style sheets
	          for (var i = 0, imported; i < styleSheet.imports.length; i++) {
	            var imported = styleSheet.imports[i];
	            var href = styleSheet._href || styleSheet.href;
	            imported._href = hrefs[i].replace(TRIM_IMPORTS, "");
	            // call this function recursively to get all imported style sheets
	            cssText += getCSSText(imported, getPath(href, path), media, level + 1);
	          }
	        }
	        // retrieve inline style or load an external style sheet
	        cssText += encode(styleSheet.href ? loadStyleSheet(styleSheet, path) : styleSheet.owningElement._cssText);
	        cssText = parseMedia(cssText, self.media);
	      }
	      return cssText;
	    };
	
	    // Load all style sheets in the document
	    for (var i = 0; i < styleSheets.length; i++) {
	      var styleSheet = styleSheets[i];
	      if (!styleSheet.disabled && !styleSheet.ie7) this.cssText += getCSSText(styleSheet);
	    }
	    
	    // helper functions
	    function parseMedia(cssText, media) {
	      filterMedia.value = media;
	      return cssText.replace(MEDIA, filterMedia);
	    };
	    
	    function filterMedia(match, media, cssText) {
	      media = toSimpleMedia(media);
	      switch (media) {
	        case "screen":
	        case "print":
	          if (media !== filterMedia.value) return "";
	        case "all":
	          return cssText;
	      }
	      return "";
	    };
	    
	    function toSimpleMedia(media) {
	      if (!media) return "all";
	      var split = media.toLowerCase().split(/\s*,\s*/);
	      media = "none";
	      for (var i = 0; i < split.length; i++) {
	        if (split[i] === "all") return "all";
	        if (split[i] === "screen") {
	          if (media === "print") return "all";
	          media = "screen";
	        } else if (split[i] === "print") {
	          if (media === "screen") return "all";
	          media = "print";
	        }
	      }
	      return media;
	    };
	    
	    // Load an external style sheet
	    function loadStyleSheet(styleSheet, path) {
	      var href = styleSheet._href || styleSheet.href;
	      var url = makePath(href, path);
	      // If the style sheet has already loaded then don't reload it
	      if (fileCache[url]) return "";
	      // Load from source
	      fileCache[url] = styleSheet.disabled ? "" :
	        fixUrls(IE7.CSS.getText(styleSheet, path), getPath(href, path));
	      return fileCache[url];
	    };
	
	    // Fix CSS paths.
	    // We're lumping all css text into one big style sheet so relative
	    // paths have to be fixed. This is necessary anyway because of other
	    // Internet Explorer bugs.
	    function fixUrls(cssText, pathname) {
	      // hack & slash
	      return cssText.replace(URL, "$1" + pathname.slice(0, pathname.lastIndexOf("/") + 1) + "$2");
	    };
	  },
	  
	  load: function() {
	    this.cssText = "";
	    this.getText();
	    this.parse();
	    if (inheritedProperties.length) {
	      this.cssText = parseInherited(this.cssText);
	    }
	    this.cssText = decode(this.cssText);
	    fileCache = {};
	  },
	  
	  parse: function() {
	    var cssText = IE7.CSS.parser.parse(this.cssText);
	    
	    var declarations = "";
	    this.cssText = cssText.replace(/@charset[^;]+;|@font\-face[^\}]+\}/g, function(match) {
	      declarations += match + "\n";
	      return "";
	    });
	    this.declarations = decode(declarations);
	    
	    // Parse the style sheet
	    var offset = IE7.CSS.rules.length;
	    var rules = [], rule;
	    while ((rule = RULE.exec(this.cssText))) {
	      var cssText = rule[2];
	      if (cssText) {
	        var fixDescendants = appVersion < 7 && cssText.indexOf("AlphaImageLoader") !== -1;
	        var selectors = rule[1].match(SELECTOR), selector;
	        for (var i = 0; selector = selectors[i]; i++) {
	          selector = trim(selector);
	          var isUnknown = IE7.CSS.UNKNOWN.test(selector);
	          selectors[i] = isUnknown ? this.createRule(selector, cssText) : selector + "{" + cssText + "}";
	          if (fixDescendants) selectors[i] += this.createRule(selector + ">*", "position:relative");
	        }
	        rules.push(selectors.join("\n"));
	      }
	    }
	    this.cssText = rules.join("\n");
	    this.rules = IE7.CSS.rules.slice(offset);
	  },
	  
	  recalc: function() {
	    var rule, i;
	    for (i = 0; (rule = this.rules[i]); i++) rule.recalc();
	  },
	  
	  toString: function() {
	    return this.declarations + "@media " + this.media + "{" + this.cssText + "}";
	  }
	});
	
	var PseudoElement;
	
	// -----------------------------------------------------------------------
	// IE7 style rules
	// -----------------------------------------------------------------------
	
	var Rule = IE7.Rule = Base.extend({
	  constructor: function(selector, cssText) {
	    this.id = IE7.CSS.rules.length;
	    this.className = Rule.PREFIX + this.id;
	    var pseudoElement = selector.match(FIRST_LINE_LETTER);
	    this.selector = (pseudoElement ? pseudoElement[1] : selector) || "*";
	    this.selectorText = this.parse(this.selector) + (pseudoElement ? pseudoElement[2] : "");
	    this.cssText = cssText;
	    this.MATCH = new RegExp("\\s" + this.className + "(\\s|$)", "g");
	    IE7.CSS.rules.push(this);
	    this.init();
	  },
	  
	  init: Undefined,
	  
	  add: function(element) {
	    // allocate this class
	    element.className += " " + this.className;
	  },
	  
	  recalc: function() {
	    // execute the underlying css query for this class
	    var match = cssQuery(this.selector);
	    // add the class name for all matching elements
	    for (var i = 0; i < match.length; i++) this.add(match[i]);
	  },
	
	  parse: function(selector) {
	    // attempt to preserve specificity for "loose" parsing by
	    //  removing unknown tokens from a css selector but keep as
	    //  much as we can..
	    var simple = selector.replace(Rule.CHILD, " ").replace(Rule.COMPLEX, "");
	    if (appVersion < 7) simple = simple.replace(Rule.MULTI, "");
	    var tags = match(simple, Rule.TAGS).length - match(selector, Rule.TAGS).length;
	    var classes = match(simple, Rule.CLASSES).length - match(selector, Rule.CLASSES).length + 1;
	    while (classes > 0 && Rule.CLASS.test(simple)) {
	      simple = simple.replace(Rule.CLASS, "");
	      classes--;
	    }
	    while (tags > 0 && Rule.TAG.test(simple)) {
	      simple = simple.replace(Rule.TAG, "$1*");
	      tags--;
	    }
	    simple += "." + this.className;
	    classes = Math.min(classes, 2);
	    tags = Math.min(tags, 2);
	    var score = -10 * classes - tags;
	    if (score > 0) {
	      simple = simple + "," + Rule.MAP[score] + " " + simple;
	    }
	    return simple;
	  },
	  
	  remove: function(element) {
	    // deallocate this class
	    element.className = element.className.replace(this.MATCH, "$1");
	  },
	  
	  toString: function() {
	    return format("%1 {%2}", this.selectorText, this.cssText);
	  }
	}, {
	  CHILD: />/g,
	  CLASS: /\.[\w-]+/,
	  CLASSES: /[.:\[]/g,
	  MULTI: /(\.[\w-]+)+/g,
	  PREFIX: "ie7_class",
	  TAG: /^\w+|([\s>+~])\w+/,
	  TAGS: /^\w|[\s>+~]\w/g,
	  MAP: {
	    "1":  "html",
	    "2":  "html body",
	    "10": ".ie7_html",
	    "11": "html.ie7_html",
	    "12": "html.ie7_html body",
	    "20": ".ie7_html .ie7_body",
	    "21": "html.ie7_html .ie7_body",
	    "22": "html.ie7_html body.ie7_body"
	  }
	});
	
	// -----------------------------------------------------------------------
	//  IE7 dynamic pseudo-classes
	// -----------------------------------------------------------------------
	
	var DynamicPseudoClass = Base.extend({
	  constructor: function(name, apply) {
	    this.name = name;
	    this.apply = apply;
	    this.instances = {};
	    IE7.CSS.dynamicPseudoClasses[name] = this;
	  },
	  
	  register: function(instance, negated) {
	    // an "instance" is actually an Arguments object
	    var _class = instance[2];
	    if (!negated && _class.negated) {
	      this.unregister(instance, true);
	    } else {
	      instance.id = _class.id + instance[0].uniqueID;
	      if (!this.instances[instance.id]) {
	        var target = instance[1], j;
	        for (j = 0; j < target.length; j++) _class.add(target[j]);
	        this.instances[instance.id] = instance;
	      }
	    }
	  },
	  
	  unregister: function(instance, negated) {
	    var _class = instance[2];
	    if (!negated && _class.negated) {
	      this.register(instance, true);
	    } else {
	      if (this.instances[instance.id]) {
	        var target = instance[1], j;
	        for (j = 0; j < target.length; j++) _class.remove(target[j]);
	        delete this.instances[instance.id];
	      }
	    }
	  }
	});
	  
	// -----------------------------------------------------------------------
	// dynamic pseudo-classes
	// -----------------------------------------------------------------------
	
	var FILTER = {
	  "<#attr>": function(match, name, operator, value) {
	    var attr = "IE7._getAttribute(e,'" + name + "')";
	    value = getString(value);
	    if (operator.length > 1) {
	      if (!value || operator === "~=" && SPACE.test(value)) {
	        return "false&&";
	      }
	      attr = "(" + attr + "||'')";
	    }
	    return "(" + format(ATTR[operator], attr, value) + ")&&";
	  },
	
	  "<#id>":    ID_ATTRIBUTE + "==='$1'&&",
	
	  "<#class>": "e.className&&(' '+e.className+' ').indexOf(' $1 ')!==-1&&",
	
	  // PSEDUO
	  ":first-child":     "!" + PREVIOUS_SIBLING + "&&",
	  ":link":           "e.currentStyle['ie7-link']=='link'&&",
	  ":visited":        "e.currentStyle['ie7-link']=='visited'&&"
	};
	
	// =========================================================================
	// ie8-css.js
	// =========================================================================
	
	var BRACKETS = "\\([^)]+\\)";
	
	// pseudo-elements can be declared with a double colon
	encoder.add(/::(before|after)/, ":$1");
	
	if (appVersion < 8) {
	
	  if (IE7.CSS.pseudoClasses) IE7.CSS.pseudoClasses += "|";
	  IE7.CSS.pseudoClasses += "before|after|lang" + BRACKETS;
	
	  // -----------------------------------------------------------------------
	  // propertyName: inherit;
	  // -----------------------------------------------------------------------
	  
	  function parseInherited(cssText) {
	    return cssText.replace(new RegExp("([{;\\s])(" + inheritedProperties.join("|") + ")\\s*:\\s*([^;}]+)", "g"), "$1$2:$3;ie7-$2:$3");
	  };
	
	  var INHERITED = /[\w-]+\s*:\s*inherit/g;
	  var STRIP_IE7_FLAGS = /ie7\-|\s*:\s*inherit/g;
	  var DASH_LOWER = /\-([a-z])/g;
	  function toUpper(match, chr) {return chr.toUpperCase()};
	  
	  IE7.CSS.addRecalc("[\\w-]+", "inherit", function(element, cssText) {
	    if (element.parentElement) {
	      var inherited = cssText.match(INHERITED);
	      for (var i = 0; i < inherited.length; i++) {
	        var propertyName = inherited[i].replace(STRIP_IE7_FLAGS, "");
	        if (element.currentStyle["ie7-" + propertyName] === "inherit") {
	          propertyName = propertyName.replace(DASH_LOWER, toUpper);
	          element.runtimeStyle[propertyName] = element.parentElement.currentStyle[propertyName];
	        }
	      }
	    }
	  }, function(match) {
	    inheritedProperties.push(rescape(match.slice(1).split(":")[0]));
	    return match;
	  });
	
	  
	
	  // -----------------------------------------------------------------------
	  // IE7 pseudo elements
	  // -----------------------------------------------------------------------
	
	  // constants
	  var URL = /^url\s*\(\s*([^)]*)\)$/;
	  var POSITION_MAP = {
	    before0: "beforeBegin",
	    before1: "afterBegin",
	    after0: "afterEnd",
	    after1: "beforeEnd"
	  };
	
	  var PseudoElement = IE7.PseudoElement = Rule.extend({
	    constructor: function(selector, position, cssText) {
	      // initialise object properties
	      this.position = position;
	      var content = cssText.match(PseudoElement.CONTENT), match, entity;
	      if (content) {
	        content = content[1];
	        match = content.split(/\s+/);
	        for (var i = 0; (entity = match[i]); i++) {
	          match[i] = /^attr/.test(entity) ? {attr: entity.slice(5, -1)} :
	            entity.charAt(0) === "'" ? getString(entity) : decode(entity);
	        }
	        content = match;
	      }
	      this.content = content;
	      // CSS text needs to be decoded immediately
	      this.base(selector, decode(cssText));
	    },
	
	    init: function() {
	      // execute the underlying css query for this class
	      this.match = cssQuery(this.selector);
	      for (var i = 0; i < this.match.length; i++) {
	        var runtimeStyle = this.match[i].runtimeStyle;
	        if (!runtimeStyle[this.position]) runtimeStyle[this.position] = {cssText:""};
	        runtimeStyle[this.position].cssText += ";" + this.cssText;
	        if (this.content != null) runtimeStyle[this.position].content = this.content;
	      }
	    },
	
	    create: function(target) {
	      var generated = target.runtimeStyle[this.position];
	      if (generated) {
	        // copy the array of values
	        var content = [].concat(generated.content || "");
	        for (var j = 0; j < content.length; j++) {
	          if (typeof content[j] == "object") {
	            content[j] = target.getAttribute(content[j].attr);
	          }
	        }
	        content = content.join("");
	        var url = content.match(URL);
	        var cssText = "overflow:hidden;" + generated.cssText.replace(/'/g, '"');
	        var position = POSITION_MAP[this.position + Number(target.canHaveChildren)];
	        var id = 'ie7_pseudo' + PseudoElement.count++;
	        target.insertAdjacentHTML(position, format(PseudoElement.ANON, this.className, id, cssText, url ? "" : content));
	        if (url) {
	          var src = getString(url[1]);
	          var pseudoElement = document.getElementById(id);
	          pseudoElement.src = src;
	          addFilter(pseudoElement, "crop");
	          var targetIsFloated = target.currentStyle.styleFloat !== "none";
	          if (pseudoElement.currentStyle.display === "inline" || targetIsFloated) {
	            if (appVersion < 7 && targetIsFloated && target.canHaveChildren) {
	              target.runtimeStyle.display = "inline";
	              target.runtimeStyle.position = "relative";
	              pseudoElement.runtimeStyle.position = "absolute";
	            }
	            pseudoElement.style.display = "inline-block";
	            if (target.currentStyle.styleFloat !== "none") {
	              pseudoElement.style.pixelWidth = target.offsetWidth;
	            }
	            var image = new Image;
	            image.onload = function() {
	              pseudoElement.style.pixelWidth = this.width;
	              pseudoElement.style.pixelHeight = Math.max(this.height, pseudoElement.offsetHeight);
	            };
	            image.src = src;
	          }
	        }
	        target.runtimeStyle[this.position] = null;
	      }
	    },
	
	    recalc: function() {
	      if (this.content == null) return;
	      for (var i = 0; i < this.match.length; i++) {
	        this.create(this.match[i]);
	      }
	    },
	
	    toString: function() {
	      return "." + this.className + "{display:inline}";
	    }
	  }, {
	    CONTENT: /content\s*:\s*([^;]*)(;|$)/,
	    ANON: "<ie7:! class='ie7_anon %1' id=%2 style='%3'>%4</ie7:!>",
	    MATCH: /(.*):(before|after).*/,
	
	    count: 0
	  });
	
	  IE7._getLang = function(element) {
	    var lang = "";
	    while (element && element.nodeType === 1) {
	      lang = element.lang || element.getAttribute("lang") || "";
	      if (lang) break;
	      element = element.parentNode;
	    }
	    return lang;
	  };
	
	  FILTER = extend(FILTER, {
	    ":lang\\(([^)]+)\\)":    "((ii=IE7._getLang(e))==='$1'||ii.indexOf('$1-')===0)&&"
	  });
	}
	
	var cssQuery = (function() {
	  var CONTEXT = /^[>+~]/;
	  
	  var useContext = false;
	  
	  // This is not a selector engine in the strictest sense. So it's best to silently error.
	  function cssQuery(selector, context, single) {
	    selector = trim(selector);
	    if (!context) context = document;
	    var ref = context;
	    useContext = CONTEXT.test(selector);
	    if (useContext) {
	      context = context.parentNode;
	      selector = "*" + selector;
	    }
	    try {
	      return selectQuery.create(selector, useContext)(context, single ? null : [], ref);
	    } catch (ex) {
	      return single ? null : [];
	    }
	  };
	
	  var VALID_SELECTOR = /^(\\.|[' >+~#.\[\]:*(),\w-\^|$=]|[^\x00-\xa0])+$/;
	
	  var _EVALUATED = /^(href|src)$/;
	  var _ATTRIBUTES = {
	    "class": "className",
	    "for": "htmlFor"
	  };
	
	  var IE7_CLASS_NAMES = /\sie7_\w+/g;
	
	  var USE_IFLAG = /^(action|cite|codebase|data|dynsrc|href|longdesc|lowsrc|src|usemap|url)$/i;
	
	  IE7._getAttribute = function(element, name) {
	    if (element.getAttributeNode) {
	      var attribute = element.getAttributeNode(name);
	    }
	    name = _ATTRIBUTES[name.toLowerCase()] || name;
	    if (!attribute) attribute = element.attributes[name];
	    var specified = attribute && attribute.specified;
	
	    if (element[name] && typeof element[name] == "boolean") return name.toLowerCase();
	    if ((specified && USE_IFLAG.test(name)) || (!attribute && MSIE5) || name === "value" || name === "type") {
	      return element.getAttribute(name, 2);
	    }
	    if (name === "style") return element.style.cssText.toLowerCase() || null;
	
	    return specified ? String(attribute.nodeValue) : null;
	  };
	
	  var names = "colSpan,rowSpan,vAlign,dateTime,accessKey,tabIndex,encType,maxLength,readOnly,longDesc";
	  // Convert the list of strings to a hash, mapping the lowercase name to the camelCase name.
	  extend(_ATTRIBUTES, combine(names.toLowerCase().split(","), names.split(",")));
	
	  IE7._getElementSibling = function(node, direction) {
	    direction += "Sibling";
	    do {
	      node = node[direction];
	      if (node && node.nodeName > "@") break;
	    } while (node);
	    return node;
	  };
	
	  var IMPLIED_ASTERISK    = /(^|[, >+~])([#.:\[])/g,
	      BLOCKS              = /\)\{/g,
	      COMMA               = /,/,
	      QUOTED              = /^['"]/,
	      HEX_ESCAPE          = /\\([\da-f]{2,2})/gi,
	      LAST_CHILD          = /last/i;
	
	  IE7._byId = function(document, id) {
	    var result = document.all[id] || null;
	    // Returns a single element or a collection.
	    if (!result || (result.nodeType && IE7._getAttribute(result, "id") === id)) return result;
	    // document.all has returned a collection of elements with name/id
	    for (var i = 0; i < result.length; i++) {
	      if (IE7._getAttribute(result[i], "id") === id) return result[i];
	    }
	    return null;
	  };
	
	  // =========================================================================
	  // dom/selectors-api/CSSSelectorParser.js
	  // =========================================================================
	
	  // http://www.w3.org/TR/css3-selectors/#w3cselgrammar (kinda)
	  var CSSSelectorParser = RegGrp.extend({
	    dictionary: new Dictionary({
	      ident:           /\-?(\\.|[_a-z]|[^\x00-\xa0])(\\.|[\w-]|[^\x00-\xa0])*/,
	      combinator:      /[\s>+~]/,
	      operator:        /[\^~|$*]?=/,
	      nth_arg:         /[+-]?\d+|[+-]?\d*n(?:\s*[+-]\s*\d+)?|even|odd/,
	      tag:             /\*|<#ident>/,
	      id:              /#(<#ident>)/,
	      'class':         /\.(<#ident>)/,
	      pseudo:          /\:([\w-]+)(?:\(([^)]+)\))?/,
	      attr:            /\[(<#ident>)(?:(<#operator>)((?:\\.|[^\[\]#.:])+))?\]/,
	      negation:        /:not\((<#tag>|<#id>|<#class>|<#attr>|<#pseudo>)\)/,
	      sequence:        /(\\.|[~*]=|\+\d|\+?\d*n\s*\+\s*\d|[^\s>+~,\*])+/,
	      filter:          /[#.:\[]<#sequence>/,
	      selector:        /[^>+~](\\.|[^,])*?/,
	      grammar:         /^(<#selector>)((,<#selector>)*)$/
	    }),
	
	    ignoreCase: true
	  });
	
	  var normalizer = new CSSSelectorParser({
	    "\\\\.|[~*]\\s+=|\\+\\s+\\d": RegGrp.IGNORE,
	    "\\[\\s+": "[",
	    "\\(\\s+": "(",
	    "\\s+\\)": ")",
	    "\\s+\\]": "]",
	    "\\s*([,>+~]|<#operator>)\\s*": "$1",
	    "\\s+$": "",
	    "\\s+": " "
	  });
	
	  function normalize(selector) {
	    selector = normalizer.parse(selector.replace(HEX_ESCAPE, "\\x$1"))
	      .replace(UNESCAPE, "$1")
	      .replace(IMPLIED_ASTERISK, "$1*$2");
	    if (!VALID_SELECTOR.test(selector)) throwSelectorError();
	    return selector;
	  };
	
	  function unescape(query) {
	    // put string values back
	    return query.replace(ESCAPED, unescapeString);
	  };
	
	  function unescapeString(match, index) {
	    return strings[index];
	  };
	
	  var BRACES = /\{/g, BRACES_ESCAPED = /\\{/g;
	
	  function closeBlock(group) {
	    return Array((group.replace(BRACES_ESCAPED, "").match(BRACES) || "").length + 1).join("}");
	  };
	
	  FILTER = new CSSSelectorParser(FILTER);
	
	  var TARGET = /:target/i, ROOT = /:root/i;
	
	  function getConstants(selector) {
	    var constants = "";
	    if (ROOT.test(selector)) constants += ",R=d.documentElement";
	    if (TARGET.test(selector)) constants += ",H=d.location;H=H&&H.hash.replace('#','')";
	    if (constants || selector.indexOf("#") !== -1) {
	      constants = ",t=c.nodeType,d=t===9?c:c.ownerDocument||(c.document||c).parentWindow.document" + constants;
	    }
	    return "var ii" + constants + ";";
	  };
	
	  var COMBINATOR = {
	    " ":   ";while(e!=s&&(e=e.parentNode)&&e.nodeType===1){",
	    ">":   ".parentElement;if(e){",
	    "+":   ";while((e=e.previousSibling)&&!(" + IS_ELEMENT + "))continue;if(e){",
	    "~":   ";while((e=e.previousSibling)){" + IF_ELEMENT
	  };
	
	  var TOKEN = /\be\b/g;
	
	  MATCHER = new CSSSelectorParser({
	    "(?:(<#selector>)(<#combinator>))?(<#tag>)(<#filter>)?$": function(match, before, combinator, tag, filters) {
	      var group = "";
	      if (tag !== "*") {
	        var TAG = tag.toUpperCase();
	        group += "if(e.nodeName==='" + TAG + (TAG === tag ? "" : "'||e.nodeName==='" + tag) + "'){";
	      }
	      if (filters) {
	        group += "if(" + FILTER.parse(filters).slice(0, -2) + "){";
	      }
	      group = group.replace(TOKEN, "e" + this.index);
	      if (combinator) {
	        group += "var e=e" + (this.index++) + COMBINATOR[combinator];
	        group = group.replace(TOKEN, "e" + this.index);
	      }
	      if (before) {
	        group += this.parse(before);
	      }
	      return group;
	    }
	  });
	  
	  var BY_ID       = "e0=IE7._byId(d,'%1');if(e0){",
	      BY_TAG_NAME = "var n=c.getElementsByTagName('%1');",
	      STORE       = "if(r==null)return e0;r[k++]=e0;";
	
	  var TAG_NAME = 1;
	
	  var SELECTOR = new CSSSelectorParser({
	    "^((?:<#selector>)?(?:<#combinator>))(<#tag>)(<#filter>)?$": true
	  });
	
	  var cache = {};
	
	  var selectById = new CSSSelectorParser({
	    "^(<#tag>)#(<#ident>)(<#filter>)?( [^,]*)?$": function(match, tagName, id, filters, after) {
	      var block = format(BY_ID, id), endBlock = "}";
	      if (filters) {
	        block += MATCHER.parse(tagName + filters);
	        endBlock = closeBlock(block);
	      }
	      if (after) {
	        block += "s=c=e0;" + selectQuery.parse("*" + after);
	      } else {
	        block += STORE;
	      }
	      return block + endBlock;
	    },
	
	    "^([^#,]+)#(<#ident>)(<#filter>)?$": function(match, before, id, filters) {
	      var block = format(BY_ID, id);
	      if (before === "*") {
	        block += STORE;
	      } else {
	        block += MATCHER.parse(before + filters) + STORE + "break";
	      }
	      return block + closeBlock(block);
	    },
	
	    "^.*$": ""
	  });
	
	  var selectQuery = new CSSSelectorParser({
	    "<#grammar>": function(match, selector, remainingSelectors) {
	      if (!this.groups) this.groups = [];
	
	      var group = SELECTOR.exec(" " + selector);
	
	      if (!group) throwSelectorError();
	
	      this.groups.push(group.slice(1));
	
	      if (remainingSelectors) {
	        return this.parse(remainingSelectors.replace(COMMA, ""));
	      }
	
	      var groups = this.groups,
	          tagName = groups[0][TAG_NAME]; // first tag name
	
	      for (var i = 1; group = groups[i]; i++) { // search tag names
	        if (tagName !== group[TAG_NAME]) {
	          tagName = "*"; // mixed tag names, so use "*"
	          break;
	        }
	      }
	
	      var matcher = "", store = STORE + "continue filtering;";
	
	      for (var i = 0; group = groups[i]; i++) {
	        MATCHER.index = 0;
	        if (tagName !== "*") group[TAG_NAME] = "*"; // we are already filtering by tagName
	        group = group.join("");
	        if (group === " *") { // select all
	          matcher = store;
	          break;
	        } else {
	          group = MATCHER.parse(group);
	          if (useContext) group += "if(e" + MATCHER.index + "==s){";
	          matcher += group + store + closeBlock(group);
	        }
	      }
	
	      // reduce to a single loop
	      var isWild = tagName === "*";
	      return (isWild ? "var n=c.all;" : format(BY_TAG_NAME, tagName)) +
	        "filtering:while((e0=n[i++]))" +
	        (isWild ? IF_ELEMENT.replace(TOKEN, "e0") : "{") +
	          matcher +
	        "}";
	    },
	
	    "^.*$": throwSelectorError
	  });
	
	  var REDUNDANT_NODETYPE_CHECKS = /\&\&(e\d+)\.nodeType===1(\)\{\s*if\(\1\.nodeName=)/g;
	
	  selectQuery.create = function(selector) {
	    if (!cache[selector]) {
	      selector = normalize(selector);
	      this.groups = null;
	      MATCHER.index = 0;
	      var block = this.parse(selector);
	      this.groups = null;
	      MATCHER.index = 0;
	      if (selector.indexOf("#") !== -1) {
	        var byId  = selectById.parse(selector);
	        if (byId) {
	          block =
	            "if(t===1||t===11|!c.getElementById){" +
	              block +
	            "}else{" +
	              byId +
	            "}";
	        }
	      }
	      // remove redundant nodeType==1 checks
	      block = block.replace(REDUNDANT_NODETYPE_CHECKS, "$2");
	      block = getConstants(selector) + decode(block);
	      cache[selector] = new Function("return function(c,r,s){var i=0,k=0,e0;" + block + "return r}")();
	    }
	    return cache[selector];
	  };
	
	  return cssQuery;
	})();
	
	function throwSelectorError() {
	  throw new SyntaxError("Invalid selector.");
	};
	
	// -----------------------------------------------------------------------
	// initialisation
	// -----------------------------------------------------------------------
	
	IE7.loaded = true;
	
	(function() {
	  try {
	    // http://javascript.nwbox.com/IEContentLoaded/
	    if (!document.body) throw "continue";
	    documentElement.doScroll("left");
	  } catch (ex) {
	    setTimeout(arguments.callee, 1);
	    return;
	  }
	
	  IE7.CSS.init();
	  IE7.CSS.apply();
	  IE7.recalc();
	})();

})(this, document);
