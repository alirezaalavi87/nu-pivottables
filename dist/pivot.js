(function() {
  // ASKME what does inclusions do? I understand its the opposite of exclusions but what is the use case?
  // FIXME the css attribute of a filtered attribute, will not be applied when restoring a table from cookie.
  //-The fact that a attribute is filtered or not should be *computed* based on opts.exclusions and applied to the UI
  var callWithJQuery,
    indexOf = [].indexOf,
    hasProp = {}.hasOwnProperty;

  callWithJQuery = function(pivotModule) {
    if (typeof exports === "object" && typeof module === "object") { // CommonJS
      return pivotModule(require("jquery"));
    } else if (typeof define === "function" && define.amd) { // AMD
      return define(["jquery"], pivotModule);
    } else {
      // Plain browser env
      return pivotModule(jQuery);
    }
  };

  callWithJQuery(function($) {
    /*
    Utilities
    */
    /*
    Default Renderer for hierarchical table layout
    */
    var PivotData, addSeparators, aggregatorTemplates, aggregators, dayNamesEn, derivers, getSort, locales, mthNamesEn, naturalSort, numberFormat, pivotTableRenderer, rd, renderers, rx, rz, sortAs, usFmt, usFmtInt, usFmtPct, zeroPad;
    addSeparators = function(nStr, thousandsSep, decimalSep) {
      var rgx, x, x1, x2;
      nStr += '';
      x = nStr.split('.');
      x1 = x[0];
      x2 = x.length > 1 ? decimalSep + x[1] : '';
      rgx = /(\d+)(\d{3})/;
      while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + thousandsSep + '$2');
      }
      return x1 + x2;
    };
    numberFormat = function(opts) {
      var defaults;
      defaults = {
        digitsAfterDecimal: 2,
        scaler: 1,
        thousandsSep: ",",
        decimalSep: ".",
        prefix: "",
        suffix: ""
      };
      opts = $.extend({}, defaults, opts);
      return function(x) {
        var result;
        if (isNaN(x) || !isFinite(x)) {
          return "";
        }
        result = addSeparators((opts.scaler * x).toFixed(opts.digitsAfterDecimal), opts.thousandsSep, opts.decimalSep);
        return "" + opts.prefix + result + opts.suffix;
      };
    };
    //aggregator templates default to US number formatting but this is overrideable
    usFmt = numberFormat();
    usFmtInt = numberFormat({
      digitsAfterDecimal: 0
    });
    usFmtPct = numberFormat({
      digitsAfterDecimal: 1,
      scaler: 100,
      suffix: "%"
    });
    aggregatorTemplates = {
      count: function(formatter = usFmtInt) {
        return function() {
          return function(data, rowKey, colKey) {
            return {
              count: 0,
              push: function() {
                return this.count++;
              },
              value: function() {
                return this.count;
              },
              format: formatter
            };
          };
        };
      },
      uniques: function(fn, formatter = usFmtInt) {
        return function([attr]) {
          return function(data, rowKey, colKey) {
            return {
              uniq: [],
              push: function(record) {
                var ref;
                if (ref = record[attr], indexOf.call(this.uniq, ref) < 0) {
                  return this.uniq.push(record[attr]);
                }
              },
              value: function() {
                return fn(this.uniq);
              },
              format: formatter,
              numInputs: attr != null ? 0 : 1
            };
          };
        };
      },
      sum: function(formatter = usFmt) {
        return function([attr]) {
          return function(data, rowKey, colKey) {
            return {
              sum: 0,
              push: function(record) {
                if (!isNaN(parseFloat(record[attr]))) {
                  return this.sum += parseFloat(record[attr]);
                }
              },
              value: function() {
                return this.sum;
              },
              format: formatter,
              numInputs: attr != null ? 0 : 1
            };
          };
        };
      },
      extremes: function(mode, formatter = usFmt) {
        return function([attr]) {
          return function(data, rowKey, colKey) {
            return {
              val: null,
              sorter: getSort(data != null ? data.sorters : void 0, attr),
              push: function(record) {
                var ref, ref1, ref2, x;
                x = record[attr];
                if (mode === "min" || mode === "max") {
                  x = parseFloat(x);
                  if (!isNaN(x)) {
                    this.val = Math[mode](x, (ref = this.val) != null ? ref : x);
                  }
                }
                if (mode === "first") {
                  if (this.sorter(x, (ref1 = this.val) != null ? ref1 : x) <= 0) {
                    this.val = x;
                  }
                }
                if (mode === "last") {
                  if (this.sorter(x, (ref2 = this.val) != null ? ref2 : x) >= 0) {
                    return this.val = x;
                  }
                }
              },
              value: function() {
                return this.val;
              },
              format: function(x) {
                if (isNaN(x)) {
                  return x;
                } else {
                  return formatter(x);
                }
              },
              numInputs: attr != null ? 0 : 1
            };
          };
        };
      },
      quantile: function(q, formatter = usFmt) {
        return function([attr]) {
          return function(data, rowKey, colKey) {
            return {
              vals: [],
              push: function(record) {
                var x;
                x = parseFloat(record[attr]);
                if (!isNaN(x)) {
                  return this.vals.push(x);
                }
              },
              value: function() {
                var i;
                if (this.vals.length === 0) {
                  return null;
                }
                this.vals.sort(function(a, b) {
                  return a - b;
                });
                i = (this.vals.length - 1) * q;
                return (this.vals[Math.floor(i)] + this.vals[Math.ceil(i)]) / 2.0;
              },
              format: formatter,
              numInputs: attr != null ? 0 : 1
            };
          };
        };
      },
      runningStat: function(mode = "mean", ddof = 1, formatter = usFmt) {
        return function([attr]) {
          return function(data, rowKey, colKey) {
            return {
              n: 0.0,
              m: 0.0,
              s: 0.0,
              push: function(record) {
                var m_new, x;
                x = parseFloat(record[attr]);
                if (isNaN(x)) {
                  return;
                }
                this.n += 1.0;
                if (this.n === 1.0) {
                  return this.m = x;
                } else {
                  m_new = this.m + (x - this.m) / this.n;
                  this.s = this.s + (x - this.m) * (x - m_new);
                  return this.m = m_new;
                }
              },
              value: function() {
                if (mode === "mean") {
                  if (this.n === 0) {
                    return 0 / 0;
                  } else {
                    return this.m;
                  }
                }
                if (this.n <= ddof) {
                  return 0;
                }
                switch (mode) {
                  case "var":
                    return this.s / (this.n - ddof);
                  case "stdev":
                    return Math.sqrt(this.s / (this.n - ddof));
                }
              },
              format: formatter,
              numInputs: attr != null ? 0 : 1
            };
          };
        };
      },
      sumOverSum: function(formatter = usFmt) {
        return function([num, denom]) {
          return function(data, rowKey, colKey) {
            return {
              sumNum: 0,
              sumDenom: 0,
              push: function(record) {
                if (!isNaN(parseFloat(record[num]))) {
                  this.sumNum += parseFloat(record[num]);
                }
                if (!isNaN(parseFloat(record[denom]))) {
                  return this.sumDenom += parseFloat(record[denom]);
                }
              },
              value: function() {
                return this.sumNum / this.sumDenom;
              },
              format: formatter,
              numInputs: (num != null) && (denom != null) ? 0 : 2
            };
          };
        };
      },
      sumOverSumBound80: function(upper = true, formatter = usFmt) {
        return function([num, denom]) {
          return function(data, rowKey, colKey) {
            return {
              sumNum: 0,
              sumDenom: 0,
              push: function(record) {
                if (!isNaN(parseFloat(record[num]))) {
                  this.sumNum += parseFloat(record[num]);
                }
                if (!isNaN(parseFloat(record[denom]))) {
                  return this.sumDenom += parseFloat(record[denom]);
                }
              },
              value: function() {
                var sign;
                sign = upper ? 1 : -1;
                return (0.821187207574908 / this.sumDenom + this.sumNum / this.sumDenom + 1.2815515655446004 * sign * Math.sqrt(0.410593603787454 / (this.sumDenom * this.sumDenom) + (this.sumNum * (1 - this.sumNum / this.sumDenom)) / (this.sumDenom * this.sumDenom))) / (1 + 1.642374415149816 / this.sumDenom);
              },
              format: formatter,
              numInputs: (num != null) && (denom != null) ? 0 : 2
            };
          };
        };
      },
      fractionOf: function(wrapped, type = "total", formatter = usFmtPct) {
        return function(...x) {
          return function(data, rowKey, colKey) {
            return {
              selector: {
                total: [[], []],
                row: [rowKey, []],
                col: [[], colKey]
              }[type],
              inner: wrapped(...x)(data, rowKey, colKey),
              push: function(record) {
                return this.inner.push(record);
              },
              format: formatter,
              value: function() {
                return this.inner.value() / data.getAggregator(...this.selector).inner.value();
              },
              numInputs: wrapped(...x)().numInputs
            };
          };
        };
      }
    };
    aggregatorTemplates.countUnique = function(f) {
      return aggregatorTemplates.uniques((function(x) {
        return x.length;
      }), f);
    };
    aggregatorTemplates.listUnique = function(s) {
      return aggregatorTemplates.uniques((function(x) {
        return x.sort(naturalSort).join(s);
      }), (function(x) {
        return x;
      }));
    };
    aggregatorTemplates.max = function(f) {
      return aggregatorTemplates.extremes('max', f);
    };
    aggregatorTemplates.min = function(f) {
      return aggregatorTemplates.extremes('min', f);
    };
    aggregatorTemplates.first = function(f) {
      return aggregatorTemplates.extremes('first', f);
    };
    aggregatorTemplates.last = function(f) {
      return aggregatorTemplates.extremes('last', f);
    };
    aggregatorTemplates.median = function(f) {
      return aggregatorTemplates.quantile(0.5, f);
    };
    aggregatorTemplates.average = function(f) {
      return aggregatorTemplates.runningStat("mean", 1, f);
    };
    aggregatorTemplates.var = function(ddof, f) {
      return aggregatorTemplates.runningStat("var", ddof, f);
    };
    aggregatorTemplates.stdev = function(ddof, f) {
      return aggregatorTemplates.runningStat("stdev", ddof, f);
    };
    //default aggregators & renderers use US naming and number formatting
    aggregators = (function(tpl) {
      return {
        "Count": tpl.count(usFmtInt),
        "Count Unique Values": tpl.countUnique(usFmtInt),
        "List Unique Values": tpl.listUnique(", "),
        "Sum": tpl.sum(usFmt),
        "Integer Sum": tpl.sum(usFmtInt),
        "Average": tpl.average(usFmt),
        "Median": tpl.median(usFmt),
        "Sample Variance": tpl.var(1, usFmt),
        "Sample Standard Deviation": tpl.stdev(1, usFmt),
        "Minimum": tpl.min(usFmt),
        "Maximum": tpl.max(usFmt),
        "First": tpl.first(usFmt),
        "Last": tpl.last(usFmt),
        "Sum over Sum": tpl.sumOverSum(usFmt),
        "80% Upper Bound": tpl.sumOverSumBound80(true, usFmt),
        "80% Lower Bound": tpl.sumOverSumBound80(false, usFmt),
        "Sum as Fraction of Total": tpl.fractionOf(tpl.sum(), "total", usFmtPct),
        "Sum as Fraction of Rows": tpl.fractionOf(tpl.sum(), "row", usFmtPct),
        "Sum as Fraction of Columns": tpl.fractionOf(tpl.sum(), "col", usFmtPct),
        "Count as Fraction of Total": tpl.fractionOf(tpl.count(), "total", usFmtPct),
        "Count as Fraction of Rows": tpl.fractionOf(tpl.count(), "row", usFmtPct),
        "Count as Fraction of Columns": tpl.fractionOf(tpl.count(), "col", usFmtPct)
      };
    })(aggregatorTemplates);
    renderers = {
      "Table": function(data, opts) {
        return pivotTableRenderer(data, opts);
      },
      "Table Barchart": function(data, opts) {
        return $(pivotTableRenderer(data, opts)).barchart();
      },
      "Heatmap": function(data, opts) {
        return $(pivotTableRenderer(data, opts)).heatmap("heatmap", opts);
      },
      "Row Heatmap": function(data, opts) {
        return $(pivotTableRenderer(data, opts)).heatmap("rowheatmap", opts);
      },
      "Col Heatmap": function(data, opts) {
        return $(pivotTableRenderer(data, opts)).heatmap("colheatmap", opts);
      }
    };
    locales = {
      en: {
        aggregators: aggregators,
        renderers: renderers,
        localeStrings: {
          renderError: "An error occurred rendering the PivotTable results.",
          computeError: "An error occurred computing the PivotTable results.",
          uiRenderError: "An error occurred rendering the PivotTable UI.",
          selectAll: "Select All",
          selectNone: "Select None",
          tooMany: "(too many to list)",
          filterResults: "Filter values",
          apply: "Apply",
          cancel: "Cancel",
          totals: "Totals", //for table renderer
          vs: "vs", //for gchart renderer
          by: "by" //for gchart renderer
        }
      }
    };
    
    //dateFormat deriver l10n requires month and day names to be passed in directly
    mthNamesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    dayNamesEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    zeroPad = function(number) {
      return ("0" + number).substr(-2, 2);
    };
    derivers = {
      bin: function(col, binWidth) {
        return function(record) {
          return record[col] - record[col] % binWidth;
        };
      },
      dateFormat: function(col, formatString, utcOutput = false, mthNames = mthNamesEn, dayNames = dayNamesEn) {
        var utc;
        utc = utcOutput ? "UTC" : "";
        return function(record) { //thanks http://stackoverflow.com/a/12213072/112871
          var date;
          date = new Date(Date.parse(record[col]));
          if (isNaN(date)) {
            return "";
          }
          return formatString.replace(/%(.)/g, function(m, p) {
            switch (p) {
              case "y":
                return date[`get${utc}FullYear`]();
              case "m":
                return zeroPad(date[`get${utc}Month`]() + 1);
              case "n":
                return mthNames[date[`get${utc}Month`]()];
              case "d":
                return zeroPad(date[`get${utc}Date`]());
              case "w":
                return dayNames[date[`get${utc}Day`]()];
              case "x":
                return date[`get${utc}Day`]();
              case "H":
                return zeroPad(date[`get${utc}Hours`]());
              case "M":
                return zeroPad(date[`get${utc}Minutes`]());
              case "S":
                return zeroPad(date[`get${utc}Seconds`]());
              default:
                return "%" + p;
            }
          });
        };
      }
    };
    rx = /(\d+)|(\D+)/g;
    rd = /\d/;
    rz = /^0/;
    naturalSort = (as, bs) => {
      var a, a1, b, b1, nas, nbs;
      if ((bs != null) && (as == null)) {
        //nulls first
        return -1;
      }
      if ((as != null) && (bs == null)) {
        return 1;
      }
      if (typeof as === "number" && isNaN(as)) {
        //then raw NaNs
        return -1;
      }
      if (typeof bs === "number" && isNaN(bs)) {
        return 1;
      }
      //numbers and numbery strings group together
      nas = +as;
      nbs = +bs;
      if (nas < nbs) {
        return -1;
      }
      if (nas > nbs) {
        return 1;
      }
      if (typeof as === "number" && typeof bs !== "number") {
        //within that, true numbers before numbery strings
        return -1;
      }
      if (typeof bs === "number" && typeof as !== "number") {
        return 1;
      }
      if (typeof as === "number" && typeof bs === "number") {
        return 0;
      }
      if (isNaN(nbs) && !isNaN(nas)) {
        // 'Infinity' is a textual number, so less than 'A'
        return -1;
      }
      if (isNaN(nas) && !isNaN(nbs)) {
        return 1;
      }
      //finally, "smart" string sorting per http://stackoverflow.com/a/4373421/112871
      a = String(as);
      b = String(bs);
      if (a === b) {
        return 0;
      }
      if (!(rd.test(a) && rd.test(b))) {
        return (a > b ? 1 : -1);
      }
      //special treatment for strings containing digits
      a = a.match(rx); //create digits vs non-digit chunks and iterate through
      b = b.match(rx);
      while (a.length && b.length) {
        a1 = a.shift();
        b1 = b.shift();
        if (a1 !== b1) {
          if (rd.test(a1) && rd.test(b1)) { //both are digit chunks
            return a1.replace(rz, ".0") - b1.replace(rz, ".0");
          } else {
            return (a1 > b1 ? 1 : -1);
          }
        }
      }
      return a.length - b.length;
    };
    sortAs = function(order) {
      var i, l_mapping, mapping, x;
      mapping = {};
      l_mapping = {}; // sort lowercased keys similarly
      for (i in order) {
        x = order[i];
        mapping[x] = i;
        if (typeof x === "string") {
          l_mapping[x.toLowerCase()] = i;
        }
      }
      return function(a, b) {
        if ((mapping[a] != null) && (mapping[b] != null)) {
          return mapping[a] - mapping[b];
        } else if (mapping[a] != null) {
          return -1;
        } else if (mapping[b] != null) {
          return 1;
        } else if ((l_mapping[a] != null) && (l_mapping[b] != null)) {
          return l_mapping[a] - l_mapping[b];
        } else if (l_mapping[a] != null) {
          return -1;
        } else if (l_mapping[b] != null) {
          return 1;
        } else {
          return naturalSort(a, b);
        }
      };
    };
    getSort = function(sorters, attr) {
      var sort;
      if (sorters != null) {
        if (typeof sorters === "function") {
          sort = sorters(attr);
          if (typeof sort === "function") {
            return sort;
          }
        } else if (sorters[attr] != null) {
          return sorters[attr];
        }
      }
      return naturalSort;
    };
    /*
    Data Model class
    */
    PivotData = class PivotData {
      constructor(input, opts = {}) {
        var ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9;
        this.arrSort = this.arrSort.bind(this);
        this.sortKeys = this.sortKeys.bind(this);
        this.getColKeys = this.getColKeys.bind(this);
        this.getRowKeys = this.getRowKeys.bind(this);
        this.getAggregator = this.getAggregator.bind(this);
        this.input = input;
        this.aggregator = (ref = opts.aggregator) != null ? ref : aggregatorTemplates.count()();
        this.aggregatorName = (ref1 = opts.aggregatorName) != null ? ref1 : "Count";
        this.colAttrs = (ref2 = opts.cols) != null ? ref2 : [];
        this.rowAttrs = (ref3 = opts.rows) != null ? ref3 : [];
        this.valAttrs = (ref4 = opts.vals) != null ? ref4 : [];
        this.sorters = (ref5 = opts.sorters) != null ? ref5 : {};
        this.rowOrder = (ref6 = opts.rowOrder) != null ? ref6 : "key_a_to_z";
        this.colOrder = (ref7 = opts.colOrder) != null ? ref7 : "key_a_to_z";
        this.derivedAttributes = (ref8 = opts.derivedAttributes) != null ? ref8 : {};
        this.filter = (ref9 = opts.filter) != null ? ref9 : (function() {
          return true;
        });
        this.tree = {};
        this.rowKeys = [];
        this.colKeys = [];
        this.rowTotals = {};
        this.colTotals = {};
        this.allTotal = this.aggregator(this, [], []);
        this.sorted = false;
        // iterate through input, accumulating data for cells
        PivotData.forEachRecord(this.input, this.derivedAttributes, (record) => {
          if (this.filter(record)) {
            return this.processRecord(record);
          }
        });
      }

      //can handle arrays or jQuery selections of tables
      static forEachRecord(input, derivedAttributes, f) {
        var addRecord, compactRecord, i, j, k, l, len1, record, ref, results, results1, tblCols;
        if ($.isEmptyObject(derivedAttributes)) {
          addRecord = f;
        } else {
          addRecord = function(record) {
            var k, ref, v;
            for (k in derivedAttributes) {
              v = derivedAttributes[k];
              record[k] = (ref = v(record)) != null ? ref : record[k];
            }
            return f(record);
          };
        }
        //if it's a function, have it call us back
        if (typeof input === "function") {
          return input(addRecord);
        } else if (Array.isArray(input)) {
          if (Array.isArray(input[0])) {
            results = [];
            for (i in input) {
              if (!hasProp.call(input, i)) continue;
              compactRecord = input[i];
              if (!(i > 0)) {
                continue;
              }
              record = {};
              ref = input[0];
              for (j in ref) {
                if (!hasProp.call(ref, j)) continue;
                k = ref[j];
                record[k] = compactRecord[j];
              }
              results.push(addRecord(record)); //array of objects
            }
            return results;
          } else {
            results1 = [];
            for (l = 0, len1 = input.length; l < len1; l++) {
              record = input[l];
              results1.push(addRecord(record));
            }
            return results1;
          }
        } else if (input instanceof $) {
          tblCols = [];
          $("thead > tr > th", input).each(function(i) {
            return tblCols.push($(this).text());
          });
          return $("tbody > tr", input).each(function(i) {
            record = {};
            $("td", this).each(function(j) {
              return record[tblCols[j]] = $(this).text();
            });
            return addRecord(record);
          });
        } else {
          throw new Error("unknown input format");
        }
      }

      forEachMatchingRecord(criteria, callback) {
        return PivotData.forEachRecord(this.input, this.derivedAttributes, (record) => {
          var k, ref, v;
          if (!this.filter(record)) {
            return;
          }
          for (k in criteria) {
            v = criteria[k];
            if (v !== ((ref = record[k]) != null ? ref : "null")) {
              return;
            }
          }
          return callback(record);
        });
      }

      arrSort(attrs) {
        var a, sortersArr;
        sortersArr = (function() {
          var l, len1, results;
          results = [];
          for (l = 0, len1 = attrs.length; l < len1; l++) {
            a = attrs[l];
            results.push(getSort(this.sorters, a));
          }
          return results;
        }).call(this);
        return function(a, b) {
          var comparison, i, sorter;
          for (i in sortersArr) {
            if (!hasProp.call(sortersArr, i)) continue;
            sorter = sortersArr[i];
            comparison = sorter(a[i], b[i]);
            if (comparison !== 0) {
              return comparison;
            }
          }
          return 0;
        };
      }

      sortKeys() {
        var v;
        if (!this.sorted) {
          this.sorted = true;
          v = (r, c) => {
            return this.getAggregator(r, c).value();
          };
          switch (this.rowOrder) {
            case "value_a_to_z":
              this.rowKeys.sort((a, b) => {
                return naturalSort(v(a, []), v(b, []));
              });
              break;
            case "value_z_to_a":
              this.rowKeys.sort((a, b) => {
                return -naturalSort(v(a, []), v(b, []));
              });
              break;
            default:
              this.rowKeys.sort(this.arrSort(this.rowAttrs));
          }
          switch (this.colOrder) {
            case "value_a_to_z":
              return this.colKeys.sort((a, b) => {
                return naturalSort(v([], a), v([], b));
              });
            case "value_z_to_a":
              return this.colKeys.sort((a, b) => {
                return -naturalSort(v([], a), v([], b));
              });
            default:
              return this.colKeys.sort(this.arrSort(this.colAttrs));
          }
        }
      }

      getColKeys() {
        this.sortKeys();
        return this.colKeys;
      }

      getRowKeys() {
        this.sortKeys();
        return this.rowKeys;
      }

      processRecord(record) { //this code is called in a tight loop
        var colKey, flatColKey, flatRowKey, l, len1, len2, n, ref, ref1, ref2, ref3, rowKey, x;
        colKey = [];
        rowKey = [];
        ref = this.colAttrs;
        for (l = 0, len1 = ref.length; l < len1; l++) {
          x = ref[l];
          colKey.push((ref1 = record[x]) != null ? ref1 : "null");
        }
        ref2 = this.rowAttrs;
        for (n = 0, len2 = ref2.length; n < len2; n++) {
          x = ref2[n];
          rowKey.push((ref3 = record[x]) != null ? ref3 : "null");
        }
        flatRowKey = rowKey.join(String.fromCharCode(0));
        flatColKey = colKey.join(String.fromCharCode(0));
        this.allTotal.push(record);
        if (rowKey.length !== 0) {
          if (!this.rowTotals[flatRowKey]) {
            this.rowKeys.push(rowKey);
            this.rowTotals[flatRowKey] = this.aggregator(this, rowKey, []);
          }
          this.rowTotals[flatRowKey].push(record);
        }
        if (colKey.length !== 0) {
          if (!this.colTotals[flatColKey]) {
            this.colKeys.push(colKey);
            this.colTotals[flatColKey] = this.aggregator(this, [], colKey);
          }
          this.colTotals[flatColKey].push(record);
        }
        if (colKey.length !== 0 && rowKey.length !== 0) {
          if (!this.tree[flatRowKey]) {
            this.tree[flatRowKey] = {};
          }
          if (!this.tree[flatRowKey][flatColKey]) {
            this.tree[flatRowKey][flatColKey] = this.aggregator(this, rowKey, colKey);
          }
          return this.tree[flatRowKey][flatColKey].push(record);
        }
      }

      getAggregator(rowKey, colKey) {
        var agg, flatColKey, flatRowKey;
        flatRowKey = rowKey.join(String.fromCharCode(0));
        flatColKey = colKey.join(String.fromCharCode(0));
        if (rowKey.length === 0 && colKey.length === 0) {
          agg = this.allTotal;
        } else if (rowKey.length === 0) {
          agg = this.colTotals[flatColKey];
        } else if (colKey.length === 0) {
          agg = this.rowTotals[flatRowKey];
        } else {
          agg = this.tree[flatRowKey][flatColKey];
        }
        return agg != null ? agg : {
          value: (function() {
            return null;
          }),
          format: function() {
            return "";
          }
        };
      }

    };
    //expose these to the outside world
    $.pivotUtilities = {aggregatorTemplates, aggregators, renderers, derivers, locales, naturalSort, numberFormat, sortAs, PivotData};
    pivotTableRenderer = function(pivotData, opts) {
      var aggregator, c, colAttrs, colKey, colKeys, defaults, getClickHandler, i, j, r, result, rowAttrs, rowKey, rowKeys, spanSize, tbody, td, th, thead, totalAggregator, tr, txt, val, x;
      defaults = {
        table: {
          clickCallback: null,
          rowTotals: true,
          colTotals: true
        },
        localeStrings: {
          totals: "Totals"
        }
      };
      opts = $.extend(true, {}, defaults, opts);
      colAttrs = pivotData.colAttrs;
      rowAttrs = pivotData.rowAttrs;
      rowKeys = pivotData.getRowKeys();
      colKeys = pivotData.getColKeys();
      if (opts.table.clickCallback) {
        getClickHandler = function(value, rowValues, colValues) {
          var attr, filters, i;
          filters = {};
          for (i in colAttrs) {
            if (!hasProp.call(colAttrs, i)) continue;
            attr = colAttrs[i];
            if (colValues[i] != null) {
              filters[attr] = colValues[i];
            }
          }
          for (i in rowAttrs) {
            if (!hasProp.call(rowAttrs, i)) continue;
            attr = rowAttrs[i];
            if (rowValues[i] != null) {
              filters[attr] = rowValues[i];
            }
          }
          return function(e) {
            return opts.table.clickCallback(e, value, filters, pivotData);
          };
        };
      }
      //now actually build the output
      result = document.createElement("table");
      result.className = "pvtTable";
      //helper function for setting row/col-span in pivotTableRenderer
      spanSize = function(arr, i, j) {
        var l, len, n, noDraw, ref, ref1, stop, x;
        if (i !== 0) {
          noDraw = true;
          for (x = l = 0, ref = j; (0 <= ref ? l <= ref : l >= ref); x = 0 <= ref ? ++l : --l) {
            if (arr[i - 1][x] !== arr[i][x]) {
              noDraw = false;
            }
          }
          if (noDraw) {
            return -1; //do not draw cell
          }
        }
        len = 0;
        while (i + len < arr.length) {
          stop = false;
          for (x = n = 0, ref1 = j; (0 <= ref1 ? n <= ref1 : n >= ref1); x = 0 <= ref1 ? ++n : --n) {
            if (arr[i][x] !== arr[i + len][x]) {
              stop = true;
            }
          }
          if (stop) {
            break;
          }
          len++;
        }
        return len;
      };
      //the first few rows are for col headers
      thead = document.createElement("thead");
      for (j in colAttrs) {
        if (!hasProp.call(colAttrs, j)) continue;
        c = colAttrs[j];
        tr = document.createElement("tr");
        if (parseInt(j) === 0 && rowAttrs.length !== 0) {
          th = document.createElement("th");
          th.setAttribute("colspan", rowAttrs.length);
          th.setAttribute("rowspan", colAttrs.length);
          tr.appendChild(th);
        }
        th = document.createElement("th");
        th.className = "pvtAxisLabel";
        th.textContent = c;
        tr.appendChild(th);
        for (i in colKeys) {
          if (!hasProp.call(colKeys, i)) continue;
          colKey = colKeys[i];
          x = spanSize(colKeys, parseInt(i), parseInt(j));
          if (x !== -1) {
            th = document.createElement("th");
            th.className = "pvtColLabel";
            th.textContent = colKey[j];
            th.setAttribute("colspan", x);
            if (parseInt(j) === colAttrs.length - 1 && rowAttrs.length !== 0) {
              th.setAttribute("rowspan", 2);
            }
            tr.appendChild(th);
          }
        }
        if (parseInt(j) === 0 && opts.table.rowTotals) {
          th = document.createElement("th");
          th.className = "pvtTotalLabel pvtRowTotalLabel";
          th.innerHTML = opts.localeStrings.totals;
          th.setAttribute("rowspan", colAttrs.length + (rowAttrs.length === 0 ? 0 : 1));
          tr.appendChild(th);
        }
        thead.appendChild(tr);
      }
      //then a row for row header headers
      if (rowAttrs.length !== 0) {
        tr = document.createElement("tr");
        for (i in rowAttrs) {
          if (!hasProp.call(rowAttrs, i)) continue;
          r = rowAttrs[i];
          th = document.createElement("th");
          th.className = "pvtAxisLabel";
          th.textContent = r;
          tr.appendChild(th);
        }
        th = document.createElement("th");
        if (colAttrs.length === 0) {
          th.className = "pvtTotalLabel pvtRowTotalLabel";
          th.innerHTML = opts.localeStrings.totals;
        }
        tr.appendChild(th);
        thead.appendChild(tr);
      }
      result.appendChild(thead);
      //now the actual data rows, with their row headers and totals
      tbody = document.createElement("tbody");
      for (i in rowKeys) {
        if (!hasProp.call(rowKeys, i)) continue;
        rowKey = rowKeys[i];
        tr = document.createElement("tr");
        for (j in rowKey) {
          if (!hasProp.call(rowKey, j)) continue;
          txt = rowKey[j];
          x = spanSize(rowKeys, parseInt(i), parseInt(j));
          if (x !== -1) {
            th = document.createElement("th");
            th.className = "pvtRowLabel";
            th.textContent = txt;
            th.setAttribute("rowspan", x);
            if (parseInt(j) === rowAttrs.length - 1 && colAttrs.length !== 0) {
              th.setAttribute("colspan", 2);
            }
            tr.appendChild(th);
          }
        }
//this is the tight loop
        for (j in colKeys) {
          if (!hasProp.call(colKeys, j)) continue;
          colKey = colKeys[j];
          aggregator = pivotData.getAggregator(rowKey, colKey);
          val = aggregator.value();
          td = document.createElement("td");
          td.className = `pvtVal row${i} col${j}`;
          td.textContent = aggregator.format(val);
          td.setAttribute("data-value", val);
          if (getClickHandler != null) {
            td.onclick = getClickHandler(val, rowKey, colKey);
          }
          tr.appendChild(td);
        }
        if (opts.table.rowTotals || colAttrs.length === 0) {
          totalAggregator = pivotData.getAggregator(rowKey, []);
          val = totalAggregator.value();
          td = document.createElement("td");
          td.className = "pvtTotal rowTotal";
          td.textContent = totalAggregator.format(val);
          td.setAttribute("data-value", val);
          if (getClickHandler != null) {
            td.onclick = getClickHandler(val, rowKey, []);
          }
          td.setAttribute("data-for", "row" + i);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      //finally, the row for col totals, and a grand total
      if (opts.table.colTotals || rowAttrs.length === 0) {
        tr = document.createElement("tr");
        if (opts.table.colTotals || rowAttrs.length === 0) {
          th = document.createElement("th");
          th.className = "pvtTotalLabel pvtColTotalLabel";
          th.innerHTML = opts.localeStrings.totals;
          th.setAttribute("colspan", rowAttrs.length + (colAttrs.length === 0 ? 0 : 1));
          tr.appendChild(th);
        }
        for (j in colKeys) {
          if (!hasProp.call(colKeys, j)) continue;
          colKey = colKeys[j];
          totalAggregator = pivotData.getAggregator([], colKey);
          val = totalAggregator.value();
          td = document.createElement("td");
          td.className = "pvtTotal colTotal";
          td.textContent = totalAggregator.format(val);
          td.setAttribute("data-value", val);
          if (getClickHandler != null) {
            td.onclick = getClickHandler(val, [], colKey);
          }
          td.setAttribute("data-for", "col" + j);
          tr.appendChild(td);
        }
        if (opts.table.rowTotals || colAttrs.length === 0) {
          totalAggregator = pivotData.getAggregator([], []);
          val = totalAggregator.value();
          td = document.createElement("td");
          td.className = "pvtGrandTotal";
          td.textContent = totalAggregator.format(val);
          td.setAttribute("data-value", val);
          if (getClickHandler != null) {
            td.onclick = getClickHandler(val, [], []);
          }
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      result.appendChild(tbody);
      //squirrel this away for later
      result.setAttribute("data-numrows", rowKeys.length);
      result.setAttribute("data-numcols", colKeys.length);
      return result;
    };
    /*
    Pivot Table core: create PivotData object and call Renderer on it
    */
    $.fn.pivot = async function(input, inputOpts, locale = "en") {
      var defaults, e, localeDefaults, localeStrings, opts, pivotData, result, x;
      if (locales[locale] == null) {
        locale = "en";
      }
      defaults = {
        cols: [],
        rows: [],
        vals: [],
        rowOrder: "key_a_to_z",
        colOrder: "key_a_to_z",
        dataClass: PivotData,
        filter: function() {
          return true;
        },
        aggregator: aggregatorTemplates.count()(),
        aggregatorName: "Count",
        sorters: {},
        derivedAttributes: {},
        renderer: pivotTableRenderer
      };
      localeStrings = $.extend(true, {}, locales.en.localeStrings, locales[locale].localeStrings);
      localeDefaults = {
        rendererOptions: {localeStrings},
        localeStrings: localeStrings
      };
      opts = $.extend(true, {}, localeDefaults, $.extend({}, defaults, inputOpts));
      result = null;
      try {
        pivotData = new opts.dataClass(input, opts);
        try {
          result = (await opts.renderer(pivotData, opts.rendererOptions));
        } catch (error) {
          e = error;
          if (typeof console !== "undefined" && console !== null) {
            console.error(e);
          }
          result = $("<span>").html(opts.localeStrings.renderError);
        }
      } catch (error) {
        e = error;
        if (typeof console !== "undefined" && console !== null) {
          console.error(e);
        }
        result = $("<span>").html(opts.localeStrings.computeError);
      }
      x = this[0];
      while (x.hasChildNodes()) {
        x.removeChild(x.lastChild);
      }
      return this.append(result);
    };
    /*
    Pivot Table UI: calls Pivot Table core above with options set by user
    */
    $.fn.pivotUI = function(input, inputOpts, overwrite = false, locale = "en") {
      /*
      COMPUTATION
      */
      /*
      COMPUTATION
      */
      /*
      Utilities
      */
      /*
      ACTION
      renders the attributes' values box
      */
      /*
      COMPUTATION
      */
      /*
      COMPUTATION
      */
      /*
      COMPUTATION
      */
      var a, aggregator, attr, attrLength, attrValues, c, colOrderArrow, defaults, e, existingOpts, filterAllAttrValues, hideAttrValuesBox, i, initialRender, l, len1, len2, len3, localeDefaults, localeStrings, materializedInput, mergeFilters, n, o, opts, ordering, pivotTable, recordsProcessed, ref, ref1, ref2, ref3, refresh, refreshAsync, refreshDelayed, renderAttrValuesBox, renderFilterList, renderer, rendererControl, rowOrderArrow, showAttrValuesBox, shownAttributes, shownInAggregators, shownInDragDrop, tr1, tr2, uiTable, unusedAttrs, unusedAttrsVerticalAutoCutoff, unusedAttrsVerticalAutoOverride, updateFilters, updateFiltersTmp, x;
      if (locales[locale] == null) {
        locale = "en";
      }
      defaults = {
        derivedAttributes: {},
        aggregators: locales[locale].aggregators,
        renderers: locales[locale].renderers,
        hiddenAttributes: [],
        hiddenFromAggregators: [],
        hiddenFromDragDrop: [],
        menuLimit: 5000,
        cols: [],
        rows: [],
        vals: [],
        rowOrder: "key_a_to_z",
        colOrder: "key_a_to_z",
        dataClass: PivotData,
        exclusions: {},
        exclusionsTmp: {},
        inclusions: {},
        unusedAttrsVertical: 85,
        autoSortUnusedAttrs: false,
        onRefresh: null,
        showUI: true,
        filter: function() {
          return true;
        },
        sorters: {}
      };
      localeStrings = $.extend(true, {}, locales.en.localeStrings, locales[locale].localeStrings);
      localeDefaults = {
        rendererOptions: {localeStrings},
        localeStrings: localeStrings
      };
      existingOpts = this.data("pivotUIOptions");
      if ((existingOpts == null) || overwrite) {
        opts = $.extend(true, {}, localeDefaults, $.extend({}, defaults, inputOpts));
      } else {
        opts = existingOpts;
      }
      renderAttrValuesBox = function(state, {attrName, attrValues, attrElem}) {
        var boxTitle, pivotSearchInput, toolbar, toolbarShortcuts, updateBtn, v, values, valuesBox, valuesList;
        values = (function() {
          var results;
          results = [];
          for (v in attrValues[attrName]) {
            results.push(v);
          }
          return results;
        })();
        valuesBox = $("<dialog>").attr("closedby", "any").addClass('pvtAttrValuesBox').on("close", function() {
          return hideAttrValuesBox();
        });
        toolbar = $("<div>").addClass("toolbar");
        updateBtn = $("<button>", {
          type: "button"
        }).addClass("btn btn--confirm").text(state.localeStrings.apply).on("click", async function() {
          // Mutate the state with updated filters
          state = updateFilters(state, {attrName, attrElem});
          await refreshAsync();
          return hideAttrValuesBox();
        });
        toolbarShortcuts = $("<div>").addClass("toolbar__shortcuts").append($("<button class='btn'>", {
          type: "button"
        }).html(state.localeStrings.selectAll).on("click", function() {
          return opts = filterAllAttrValues(state, {
            attrName,
            attrValues: values,
            isExcluded: false
          });
        })).append($("<button class='btn'>", {
          type: "button"
        }).html(state.localeStrings.selectNone).on("click", function() {
          return opts = filterAllAttrValues(state, {
            attrName,
            attrValues: values,
            isExcluded: true
          });
        }));
        pivotSearchInput = $("<input>", {
          type: "text",
          placeholder: state.localeStrings.filterResults,
          class: "pvtSearch",
          autofocus: true,
          dir: "auto"
        }).attr("autofocus", "true").attr("dir", "auto").on("keyup", function() {
          var filter;
          filter = String($(this).val().toLowerCase()).trim();
          return valuesBox.find(".pvtCheckContainer li").each(function() {
            var testString;
            testString = $(this).text().toLowerCase().indexOf(filter);
            if (testString !== -1) {
              return $(this).show();
            } else {
              return $(this).hide();
            }
          });
        });
        boxTitle = $("<h4>").text(`${attrName} - (${values.length})`);
        // Handle if menu entries are too large
        if (values.length > state.menuLimit) {
          valuesBox.append($("<p>").text(state.localeStrings.tooMany));
          return valuesBox;
        }
        valuesList = renderFilterList(values, attrValues, state, attrName);
        // Assemble the UI
        valuesBox.append(toolbar, boxTitle);
        toolbar.append(updateBtn, toolbarShortcuts);
        valuesBox.append($("<br>"));
        valuesBox.append(pivotSearchInput, valuesList);
        return valuesBox;
      };
      renderFilterList = function(values, attrValues, opts, attrName) {
        var filterList, l, len1, ref, value;
        filterList = $("<ul>").addClass("pvtCheckContainer");
        ref = values.sort(getSort(opts.sorters, attrName));
        // Render Items
        for (l = 0, len1 = ref.length; l < len1; l++) {
          value = ref[l];
          (function(value) {
            var filterItem, isFilterItemExcluded, ref1, ref2, valueCount;
            valueCount = attrValues[attrName][value];
            filterItem = $("<li>");
            // TODO also check for inclusions? (what are inclusions for?)
            isFilterItemExcluded = (ref1 = opts != null ? (ref2 = opts.exclusions[attrName]) != null ? ref2.hasOwnProperty(value) : void 0 : void 0) != null ? ref1 : false;
            //                    if opts.inclusions[attrName]
            //                        isFilterItemExcluded = (value not in opts.inclusions[attrName])
            //                    else if opts.exclusions[attrName]
            //                        isFilterItemExcluded = (value in opts.exclusions[attrName])
            $("<input>").attr("type", "checkbox").prop("checked", !isFilterItemExcluded).data("filter", [attrName, value]).addClass("pvtFilter").appendTo(filterItem).on("change", function() {
              var isSelected;
              isSelected = $(this).is(":checked");
              return opts = updateFiltersTmp({attrName, value}, isSelected, opts);
            });
            filterItem.append($("<span>").addClass("value").text(value));
            filterItem.append($("<span>").addClass("count").text("(" + valueCount + ")"));
            return filterList.append(filterItem);
          })(value);
        }
        return filterList;
      };
      hideAttrValuesBox = function() {
        return $(".pvtAttrValuesBox").remove();
      };
      /*
      ACTION
      */
      // TODO I feel like showAttrValuesBox can be cleaner with it's parameters.
      // Currently there is some argument drilling going on. Some say it can be better with state monads or currying but
      //-I should look deeper into them
      showAttrValuesBox = function(opts, {attrName, anchorSelector = ".pvtUi", attrValues, attrElem}) {
        var anchorEl, isBoxOpen, valuesBox;
        isBoxOpen = $(".pvtAttrValuesBox").length > 0;
        // Close previous boxes if open
        if (isBoxOpen) {
          hideAttrValuesBox();
        }
        anchorEl = $(anchorSelector);
        if (anchorEl == null) {
          throw `Element with selector ${anchorSelector} was not found to attach the attrValuesBox to`;
        }
        valuesBox = renderAttrValuesBox(opts, {attrName, attrValues, attrElem});
        valuesBox.find(".pvtSearch").val("");
        anchorEl.prepend(valuesBox); //Add valuesBox to DOM on the specified anchor
        return valuesBox[0].showModal();
      };
      updateFiltersTmp = function({attrName, value}, isSelected, state) {
        // If attr doesn't exist, create i in exclusionsTmp
        if (!state.exclusionsTmp[attrName]) {
          state.exclusionsTmp[attrName] = {};
        }
        state.exclusionsTmp[attrName][value] = !isSelected;
        return state;
      };
      updateFilters = function(state, {attrName, attrElem}) {
        state.exclusions = mergeFilters(state.exclusions, state.exclusionsTmp);
        state.exclusionsTmp = {}; // Empty the temporary exclusions after the merge
        // Update the CSS of the attribute item with exclusions
        if (Object.prototype.hasOwnProperty.call(opts.exclusions, attrName)) {
          attrElem.addClass("pvtFilteredAttribute");
        } else {
          attrElem.removeClass("pvtFilteredAttribute");
        }
        return state;
      };
      mergeFilters = function(mainFilters, tmpFilters) {
        var mergedFilters, newAttrs;
        if (!mainFilters || !tmpFilters) {
          throw new TypeError("provide valid filter objects. filters must be of structure: {obj: {foo: boolean}}");
        }
        mergedFilters = mainFilters;
        newAttrs = Object.keys(tmpFilters);
        newAttrs.forEach((attr) => {
          var attrValues;
          attrValues = Object.keys(tmpFilters[attr]);
          if (!mergedFilters[attr]) {
            mergedFilters[attr] = {};
          }
          attrValues.forEach((value) => {
            var isValueExcluded;
            isValueExcluded = tmpFilters[attr][value];
            if (!isValueExcluded) {
              delete mergedFilters[attr][value];
              return;
            }
            // If value should be excluded, add it to exclusions
            return mergedFilters[attr][value] = isValueExcluded;
          });
          if (!Object.keys(mergedFilters[attr]).length) {
            return delete mergedFilters[attr];
          }
        });
        return mergedFilters;
      };
      filterAllAttrValues = function(state, {attrName, attrValues, isExcluded}) {
        var l, len1, val;
        state.exclusionsTmp[attrName] = {};
        for (l = 0, len1 = attrValues.length; l < len1; l++) {
          val = attrValues[l];
          state.exclusionsTmp[attrName][val] = isExcluded;
        }
        $(".pvtFilter").prop("checked", !isExcluded);
        return state;
      };
      try {
        // do a first pass on the data to cache a materialized copy of any
        // function-valued inputs and to compute dimension cardinalities
        attrValues = {};
        materializedInput = [];
        recordsProcessed = 0;
        PivotData.forEachRecord(input, opts.derivedAttributes, function(record) {
          var attr, base, ref, value;
          if (!opts.filter(record)) {
            return;
          }
          materializedInput.push(record);
          for (attr in record) {
            if (!hasProp.call(record, attr)) continue;
            if (attrValues[attr] == null) {
              attrValues[attr] = {};
              if (recordsProcessed > 0) {
                attrValues[attr]["null"] = recordsProcessed;
              }
            }
          }
          for (attr in attrValues) {
            value = (ref = record[attr]) != null ? ref : "null";
            if ((base = attrValues[attr])[value] == null) {
              base[value] = 0;
            }
            attrValues[attr][value]++;
          }
          return recordsProcessed++;
        });
        //start building the output
        uiTable = $("<table>", {
          "class": "pvtUi"
        }).attr("cellpadding", 5);
        //renderer control
        rendererControl = $("<td>").addClass("pvtUiCell");
        renderer = $("<select>").addClass('pvtRenderer').appendTo(rendererControl).on("change", function() {
          return refresh(); //capture reference
        });
        ref = opts.renderers;
        for (x in ref) {
          if (!hasProp.call(ref, x)) continue;
          $("<option>").val(x).html(x).appendTo(renderer);
        }
        //axis list, including the double-click menu
        unusedAttrs = $("<td>").addClass('pvtAxisContainer pvtUnused pvtUiCell');
        shownAttributes = (function() {
          var results;
          results = [];
          for (a in attrValues) {
            if (indexOf.call(opts.hiddenAttributes, a) < 0) {
              results.push(a);
            }
          }
          return results;
        })();
        shownInAggregators = (function() {
          var l, len1, results;
          results = [];
          for (l = 0, len1 = shownAttributes.length; l < len1; l++) {
            c = shownAttributes[l];
            if (indexOf.call(opts.hiddenFromAggregators, c) < 0) {
              results.push(c);
            }
          }
          return results;
        })();
        shownInDragDrop = (function() {
          var l, len1, results;
          results = [];
          for (l = 0, len1 = shownAttributes.length; l < len1; l++) {
            c = shownAttributes[l];
            if (indexOf.call(opts.hiddenFromDragDrop, c) < 0) {
              results.push(c);
            }
          }
          return results;
        })();
        // ASKME what is the usecase of unusedAttrsVertical? why add unnecessary complexity?
        unusedAttrsVerticalAutoOverride = false;
        if (opts.unusedAttrsVertical === "auto") {
          unusedAttrsVerticalAutoCutoff = 120; // legacy support
        } else {
          unusedAttrsVerticalAutoCutoff = parseInt(opts.unusedAttrsVertical);
        }
        if (!isNaN(unusedAttrsVerticalAutoCutoff)) {
          attrLength = 0;
          for (l = 0, len1 = shownInDragDrop.length; l < len1; l++) {
            a = shownInDragDrop[l];
            attrLength += a.length;
          }
          unusedAttrsVerticalAutoOverride = attrLength > unusedAttrsVerticalAutoCutoff;
        }
        if (opts.unusedAttrsVertical === true || unusedAttrsVerticalAutoOverride) {
          unusedAttrs.addClass('pvtVertList');
        } else {
          unusedAttrs.addClass('pvtHorizList');
        }
        for (i in shownInDragDrop) {
          if (!hasProp.call(shownInDragDrop, i)) continue;
          attr = shownInDragDrop[i];
          (function(attr) {
            var attrElem, triangleLink;
            triangleLink = $("<span>").addClass('pvtTriangle').html(" &#x25BE;").on("click", function() {
              return showAttrValuesBox(opts, {
                attrName: attr,
                attrValues,
                attrElem
              });
            });
            attrElem = $("<li>").addClass(`axis_${i}`).append($("<span>").addClass('pvtAttr').text(attr).data("attrName", attr).append(triangleLink));
            return unusedAttrs.append(attrElem);
          })(attr);
        }
        tr1 = $("<tr>").appendTo(uiTable);
        //aggregator menu and value area
        aggregator = $("<select>").addClass('pvtAggregator').on("change", function() {
          return refresh(); //capture reference
        });
        ref1 = opts.aggregators;
        for (x in ref1) {
          if (!hasProp.call(ref1, x)) continue;
          aggregator.append($("<option>").val(x).html(x));
        }
        ordering = {
          key_a_to_z: {
            rowSymbol: "&varr;",
            colSymbol: "&harr;",
            next: "value_a_to_z"
          },
          value_a_to_z: {
            rowSymbol: "&darr;",
            colSymbol: "&rarr;",
            next: "value_z_to_a"
          },
          value_z_to_a: {
            rowSymbol: "&uarr;",
            colSymbol: "&larr;",
            next: "key_a_to_z"
          }
        };
        rowOrderArrow = $("<a>", {
          role: "button"
        }).addClass("pvtRowOrder").data("order", opts.rowOrder).html(ordering[opts.rowOrder].rowSymbol).on("click", function() {
          $(this).data("order", ordering[$(this).data("order")].next);
          $(this).html(ordering[$(this).data("order")].rowSymbol);
          return refresh();
        });
        colOrderArrow = $("<a>", {
          role: "button"
        }).addClass("pvtColOrder").data("order", opts.colOrder).html(ordering[opts.colOrder].colSymbol).on("click", function() {
          $(this).data("order", ordering[$(this).data("order")].next);
          $(this).html(ordering[$(this).data("order")].colSymbol);
          return refresh();
        });
        $("<td>").addClass('pvtVals pvtUiCell').appendTo(tr1).append(aggregator).append(rowOrderArrow).append(colOrderArrow).append($("<br>"));
        //column axes
        $("<td>").addClass('pvtAxisContainer pvtHorizList pvtCols pvtUiCell').appendTo(tr1);
        tr2 = $("<tr>").appendTo(uiTable);
        //row axes
        tr2.append($("<td>").addClass('pvtAxisContainer pvtRows pvtUiCell').attr("valign", "top"));
        //the actual pivot table container
        pivotTable = $("<td>").attr("valign", "top").addClass('pvtRendererArea').appendTo(tr2);
        //finally the renderer dropdown and unused attribs are inserted at the requested location
        if (opts.unusedAttrsVertical === true || unusedAttrsVerticalAutoOverride) {
          uiTable.find('tr:nth-child(1)').prepend(rendererControl);
          uiTable.find('tr:nth-child(2)').prepend(unusedAttrs);
        } else {
          uiTable.prepend($("<tr>").append(rendererControl).append(unusedAttrs));
        }
        //render the UI in its default state
        this.html(uiTable);
        ref2 = opts.cols;
        //set up the UI initial state as requested by moving elements around
        for (n = 0, len2 = ref2.length; n < len2; n++) {
          x = ref2[n];
          this.find(".pvtCols").append(this.find(`.axis_${$.inArray(x, shownInDragDrop)}`));
        }
        ref3 = opts.rows;
        for (o = 0, len3 = ref3.length; o < len3; o++) {
          x = ref3[o];
          this.find(".pvtRows").append(this.find(`.axis_${$.inArray(x, shownInDragDrop)}`));
        }
        if (opts.aggregatorName != null) {
          this.find(".pvtAggregator").val(opts.aggregatorName);
        }
        if (opts.rendererName != null) {
          this.find(".pvtRenderer").val(opts.rendererName);
        }
        if (!opts.showUI) {
          this.find(".pvtUiCell").hide();
        }
        initialRender = true;
        //set up for refreshing
        refreshDelayed = () => {
          var len4, newDropdown, numInputsToProcess, pivotUIOptions, pvtVals, ref4, ref5, subopts, t, u, unusedAttrsContainer, vals;
          subopts = {
            derivedAttributes: opts.derivedAttributes,
            localeStrings: opts.localeStrings,
            rendererOptions: opts.rendererOptions,
            sorters: opts.sorters,
            cols: [],
            rows: [],
            dataClass: opts.dataClass
          };
          numInputsToProcess = (ref4 = opts.aggregators[aggregator.val()]([])().numInputs) != null ? ref4 : 0;
          vals = [];
          this.find(".pvtRows li span.pvtAttr").each(function() {
            return subopts.rows.push($(this).data("attrName"));
          });
          this.find(".pvtCols li span.pvtAttr").each(function() {
            return subopts.cols.push($(this).data("attrName"));
          });
          this.find(".pvtVals select.pvtAttrDropdown").each(function() {
            if (numInputsToProcess === 0) {
              return $(this).remove();
            } else {
              numInputsToProcess--;
              if ($(this).val() !== "") {
                return vals.push($(this).val());
              }
            }
          });
          if (numInputsToProcess !== 0) {
            pvtVals = this.find(".pvtVals");
            for (x = t = 0, ref5 = numInputsToProcess; (0 <= ref5 ? t < ref5 : t > ref5); x = 0 <= ref5 ? ++t : --t) {
              newDropdown = $("<select>").addClass('pvtAttrDropdown').append($("<option>")).on("change", function() {
                return refresh();
              });
              for (u = 0, len4 = shownInAggregators.length; u < len4; u++) {
                attr = shownInAggregators[u];
                newDropdown.append($("<option>").val(attr).text(attr));
              }
              pvtVals.append(newDropdown);
            }
          }
          if (initialRender) {
            vals = opts.vals;
            i = 0;
            this.find(".pvtVals select.pvtAttrDropdown").each(function() {
              $(this).val(vals[i]);
              return i++;
            });
            initialRender = false;
          }
          subopts.aggregatorName = aggregator.val();
          subopts.vals = vals;
          subopts.aggregator = opts.aggregators[aggregator.val()](vals);
          subopts.renderer = opts.renderers[renderer.val()];
          subopts.rowOrder = rowOrderArrow.data("order");
          subopts.colOrder = colOrderArrow.data("order");
          subopts.filter = function(record) {
            var excludedItems, k, ref6;
            if (!opts.filter(record)) {
              return false;
            }
            ref6 = opts.exclusions;
            for (k in ref6) {
              excludedItems = ref6[k];
// Check if any of the attribute values of the record matches any of the excluded attributes
              for (attr in excludedItems) {
                if (record[k] === attr && excludedItems[attr]) {
                  return false;
                }
              }
            }
            return true;
          };
          pivotTable.pivot(materializedInput, subopts);
          pivotUIOptions = $.extend({}, opts, {
            cols: subopts.cols,
            rows: subopts.rows,
            colOrder: subopts.colOrder,
            rowOrder: subopts.rowOrder,
            vals: vals,
            inclusionsInfo: opts.inclusions, //duplicated for backwards-compatibility
            aggregatorName: aggregator.val(),
            rendererName: renderer.val()
          });
          this.data("pivotUIOptions", pivotUIOptions);
          // if requested make sure unused columns are in alphabetical order
          if (opts.autoSortUnusedAttrs) {
            unusedAttrsContainer = this.find("td.pvtUnused.pvtAxisContainer");
            $(unusedAttrsContainer).children("li").sort((a, b) => {
              return naturalSort($(a).text(), $(b).text());
            }).appendTo(unusedAttrsContainer);
          }
          pivotTable.css("opacity", 1);
          if (opts.onRefresh != null) {
            return opts.onRefresh(pivotUIOptions);
          }
        };
        refresh = () => {
          pivotTable.css("opacity", 0.5);
          return setTimeout(refreshDelayed, 10);
        };
        refreshAsync = () => {
          pivotTable.css("opacity", 0.5);
          return new Promise(function(resolve) {
            return setTimeout((function() {
              refreshDelayed();
              return resolve();
            }), 10);
          });
        };
        //the very first refresh will actually display the table
        refresh();
        this.find(".pvtAxisContainer").sortable({
          update: function(e, ui) {
            if (ui.sender == null) {
              return refresh();
            }
          },
          connectWith: this.find(".pvtAxisContainer"),
          items: 'li',
          placeholder: 'pvtPlaceholder'
        });
      } catch (error) {
        e = error;
        if (typeof console !== "undefined" && console !== null) {
          console.error(e);
        }
        this.html(opts.localeStrings.uiRenderError);
      }
      return this;
    };
    /*
    Heatmap post-processing
    */
    $.fn.heatmap = function(scope = "heatmap", opts) {
      var colorScaleGenerator, heatmapper, i, j, l, n, numCols, numRows, ref, ref1, ref2;
      numRows = this.data("numrows");
      numCols = this.data("numcols");
      // given a series of values
      // must return a function to map a given value to a CSS color
      colorScaleGenerator = opts != null ? (ref = opts.heatmap) != null ? ref.colorScaleGenerator : void 0 : void 0;
      if (colorScaleGenerator == null) {
        colorScaleGenerator = function(values) {
          var max, min;
          min = Math.min(...values);
          max = Math.max(...values);
          return function(x) {
            var nonRed;
            nonRed = 255 - Math.round(255 * (x - min) / (max - min));
            return `rgb(255,${nonRed},${nonRed})`;
          };
        };
      }
      heatmapper = (scope) => {
        var colorScale, forEachCell, values;
        forEachCell = (f) => {
          return this.find(scope).each(function() {
            var x;
            x = $(this).data("value");
            if ((x != null) && isFinite(x)) {
              return f(x, $(this));
            }
          });
        };
        values = [];
        forEachCell(function(x) {
          return values.push(x);
        });
        colorScale = colorScaleGenerator(values);
        return forEachCell(function(x, elem) {
          return elem.css("background-color", colorScale(x));
        });
      };
      switch (scope) {
        case "heatmap":
          heatmapper(".pvtVal");
          break;
        case "rowheatmap":
          for (i = l = 0, ref1 = numRows; (0 <= ref1 ? l < ref1 : l > ref1); i = 0 <= ref1 ? ++l : --l) {
            heatmapper(`.pvtVal.row${i}`);
          }
          break;
        case "colheatmap":
          for (j = n = 0, ref2 = numCols; (0 <= ref2 ? n < ref2 : n > ref2); j = 0 <= ref2 ? ++n : --n) {
            heatmapper(`.pvtVal.col${j}`);
          }
      }
      heatmapper(".pvtTotal.rowTotal");
      heatmapper(".pvtTotal.colTotal");
      return this;
    };
    /*
    Barchart post-processing
    */
    return $.fn.barchart = function(opts) {
      var barcharter, i, l, numCols, numRows, ref;
      numRows = this.data("numrows");
      numCols = this.data("numcols");
      barcharter = (scope) => {
        var forEachCell, max, min, range, scaler, values;
        forEachCell = (f) => {
          return this.find(scope).each(function() {
            var x;
            x = $(this).data("value");
            if ((x != null) && isFinite(x)) {
              return f(x, $(this));
            }
          });
        };
        values = [];
        forEachCell(function(x) {
          return values.push(x);
        });
        max = Math.max(...values);
        if (max < 0) {
          max = 0;
        }
        range = max;
        min = Math.min(...values);
        if (min < 0) {
          range = max - min;
        }
        scaler = function(x) {
          return 100 * x / (1.4 * range);
        };
        return forEachCell(function(x, elem) {
          var bBase, bgColor, text, wrapper;
          text = elem.text();
          wrapper = $("<div>").css({
            "position": "relative",
            "height": "55px"
          });
          bgColor = "gray";
          bBase = 0;
          if (min < 0) {
            bBase = scaler(-min);
          }
          if (x < 0) {
            bBase += scaler(x);
            bgColor = "darkred";
            x = -x;
          }
          wrapper.append($("<div>").css({
            "position": "absolute",
            "bottom": bBase + "%",
            "left": 0,
            "right": 0,
            "height": scaler(x) + "%",
            "background-color": bgColor
          }));
          wrapper.append($("<div>").text(text).css({
            "position": "relative",
            "padding-left": "5px",
            "padding-right": "5px"
          }));
          return elem.css({
            "padding": 0,
            "padding-top": "5px",
            "text-align": "center"
          }).html(wrapper);
        });
      };
      for (i = l = 0, ref = numRows; (0 <= ref ? l < ref : l > ref); i = 0 <= ref ? ++l : --l) {
        barcharter(`.pvtVal.row${i}`);
      }
      barcharter(".pvtTotal.colTotal");
      return this;
    };
  });

}).call(this);

//# sourceMappingURL=pivot.js.map
