(function() {
  var callWithJQuery;

  callWithJQuery = function(pivotModule) {
    if (typeof exports === "object" && typeof module === "object") { // CommonJS
      return pivotModule(require("jquery"), require("bb"));
    } else if (typeof define === "function" && define.amd) { // AMD
      return define(["jquery", "bb"], pivotModule);
    } else {
      // Plain browser env
      return pivotModule(jQuery, bb);
    }
  };

  callWithJQuery(function($, bb) {
    var makeBBChart;
    makeBBChart = function(chartOpts = {}) {
      return function(pivotData, opts) {
        var agg, attrs, base, base1, base2, base3, base4, base5, base6, base7, c, categories, colKey, colKeys, columns, dataColumns, defaults, formatter, fullAggName, groupByTitle, h, hAxisTitle, headers, i, j, k, l, len, len1, len2, len3, len4, m, numCharsInHAxis, numSeries, params, ref, ref1, ref2, ref3, result, rotationAngle, row, rowHeader, rowKey, rowKeys, s, scatterData, series, title, titleText, vAxisTitle, val, vals, x, xs, y;
        defaults = {
          localeStrings: {
            vs: "vs",
            by: "by"
          },
          bb: {}
        };
        opts = $.extend(true, {}, defaults, opts);
        if ((base = opts.bb).size == null) {
          base.size = {};
        }
        if ((base1 = opts.bb.size).width == null) {
          base1.width = window.innerWidth;
        }
        if ((base2 = opts.bb.size).height == null) {
          base2.height = window.innerHeight;
        }
        if (chartOpts.type == null) {
          chartOpts.type = "line";
        }
        if (chartOpts.horizontal == null) {
          chartOpts.horizontal = false;
        }
        if (chartOpts.stacked == null) {
          chartOpts.stacked = false;
        }
        rowKeys = pivotData.getRowKeys();
        if (rowKeys.length === 0) {
          rowKeys.push([]);
        }
        colKeys = pivotData.getColKeys();
        if (colKeys.length === 0) {
          colKeys.push([]);
        }
        headers = (function() {
          var i, len, results;
          results = [];
          for (i = 0, len = colKeys.length; i < len; i++) {
            h = colKeys[i];
            results.push(h.join("-"));
          }
          return results;
        })();
        rotationAngle = 0;
        fullAggName = pivotData.aggregatorName;
        if (pivotData.valAttrs.length) {
          fullAggName += `(${pivotData.valAttrs.join(", ")})`;
        }
        if (chartOpts.type === "scatter") {
          scatterData = {
            x: {},
            y: {},
            t: {}
          };
          attrs = pivotData.rowAttrs.concat(pivotData.colAttrs);
          vAxisTitle = (ref = attrs[0]) != null ? ref : "";
          hAxisTitle = (ref1 = attrs[1]) != null ? ref1 : "";
          groupByTitle = attrs.slice(2).join("-");
          titleText = vAxisTitle;
          if (hAxisTitle !== "") {
            titleText += ` ${opts.localeStrings.vs} ${hAxisTitle}`;
          }
          if (groupByTitle !== "") {
            titleText += ` ${opts.localeStrings.by} ${groupByTitle}`;
          }
          for (i = 0, len = rowKeys.length; i < len; i++) {
            rowKey = rowKeys[i];
            for (j = 0, len1 = colKeys.length; j < len1; j++) {
              colKey = colKeys[j];
              agg = pivotData.getAggregator(rowKey, colKey);
              if (agg.value() != null) {
                vals = rowKey.concat(colKey);
                series = vals.slice(2).join("-");
                if (series === "") {
                  series = "series";
                }
                if ((base3 = scatterData.x)[series] == null) {
                  base3[series] = [];
                }
                if ((base4 = scatterData.y)[series] == null) {
                  base4[series] = [];
                }
                y = (ref2 = vals[0]) != null ? ref2 : 0;
                x = (ref3 = vals[1]) != null ? ref3 : 0;
                scatterData.y[series].push(y);
                scatterData.x[series].push(x);
                if ((base5 = scatterData.t)[series] == null) {
                  base5[series] = {};
                }
                if ((base6 = scatterData.t[series])[x] == null) {
                  base6[x] = {};
                }
                scatterData.t[series][x][y] = agg.value();
              }
            }
          }
        } else {
          numCharsInHAxis = 0;
          for (k = 0, len2 = headers.length; k < len2; k++) {
            x = headers[k];
            numCharsInHAxis += x.length;
          }
          if (numCharsInHAxis > 50) {
            rotationAngle = 45;
          }
          columns = [];
          for (l = 0, len3 = rowKeys.length; l < len3; l++) {
            rowKey = rowKeys[l];
            rowHeader = rowKey.join("-");
            row = [rowHeader === "" ? fullAggName : rowHeader];
            for (m = 0, len4 = colKeys.length; m < len4; m++) {
              colKey = colKeys[m];
              val = parseFloat(pivotData.getAggregator(rowKey, colKey).value());
              if (isFinite(val)) {
                row.push(val);
              } else {
                row.push(null);
              }
            }
            columns.push(row);
          }
          vAxisTitle = fullAggName;
          if (chartOpts.horizontal) {
            hAxisTitle = pivotData.rowAttrs.join("-");
            groupByTitle = pivotData.colAttrs.join("-");
          } else {
            hAxisTitle = pivotData.colAttrs.join("-");
            groupByTitle = pivotData.rowAttrs.join("-");
          }
          titleText = fullAggName;
          if (hAxisTitle !== "") {
            titleText += ` ${opts.localeStrings.vs} ${hAxisTitle}`;
          }
          if (groupByTitle !== "") {
            titleText += ` ${opts.localeStrings.by} ${groupByTitle}`;
          }
        }
        title = $("<p>", {
          style: "text-align: center; font-weight: bold"
        });
        title.attr("dir", "auto");
        title.text(titleText);
        formatter = pivotData.getAggregator([], []).format;
        params = {
          axis: {
            rotated: chartOpts.horizontal,
            y: {
              label: vAxisTitle,
              tick: {}
            },
            x: {
              label: hAxisTitle,
              tick: {
                rotate: rotationAngle,
                multiline: false
              }
            }
          },
          data: {
            type: chartOpts.type,
            order: null
          },
          tooltip: {
            grouped: false
          },
          color: {
            pattern: ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"]
          },
          clipPath: false,
          resize: {
            auto: "parent",
            timer: false
          }
        };
        params = $.extend(true, {}, params, opts.bb);
        if (chartOpts.type === "scatter") {
          xs = {};
          numSeries = 0;
          dataColumns = [];
          for (s in scatterData.x) {
            numSeries += 1;
            xs[s] = s + "_x";
            dataColumns.push([s + "_x"].concat(scatterData.x[s]));
            dataColumns.push([s].concat(scatterData.y[s]));
          }
          params.data.xs = xs;
          params.data.columns = dataColumns;
          params.axis.x.tick = {
            fit: false
          };
          if (numSeries === 1) {
            params.legend = {
              show: false
            };
          }
          params.tooltip.format = {
            title: function() {
              return fullAggName;
            },
            name: function() {
              return "";
            },
            value: function(a, b, c, d, e) {
              ({
                name: series,
                value: y,
                x
              } = e[0]);
              return formatter(scatterData.t[series][x][y]);
            }
          };
        } else {
          params.axis.x.type = 'category';
          if ((base7 = params.axis.y.tick).format == null) {
            base7.format = function(v) {
              return formatter(v);
            };
          }
          params.tooltip.format = {
            value: function(v) {
              return formatter(v);
            }
          };
          if (chartOpts.horizontal) {
            categories = (function() {
              var len5, n, results;
              results = [];
              for (n = 0, len5 = columns.length; n < len5; n++) {
                c = columns[n];
                results.push(c.shift());
              }
              return results;
            })();
            if (categories.length === 1 && categories[0] === fullAggName) {
              categories = [""];
            }
            params.axis.x.categories = categories;
            if (headers.length === 1 && headers[0] === "") {
              headers = [fullAggName];
            }
            columns.unshift(headers);
            params.data.rows = columns;
          } else {
            params.axis.x.categories = headers;
            params.data.columns = columns;
          }
        }
        if (chartOpts.stacked) {
          if (chartOpts.horizontal) {
            params.data.groups = [
              (function() {
                var len5,
              n,
              results;
                results = [];
                for (n = 0, len5 = colKeys.length; n < len5; n++) {
                  x = colKeys[n];
                  results.push(x.join("-"));
                }
                return results;
              })()
            ];
          } else {
            params.data.groups = [
              (function() {
                var len5,
              n,
              results;
                results = [];
                for (n = 0, len5 = rowKeys.length; n < len5; n++) {
                  x = rowKeys[n];
                  results.push(x.join("-"));
                }
                return results;
              })()
            ];
          }
        }
        // attaching to the render box results in correct rendering and calculation of dimensions.
        // Lazy rendering might also be possible but I couldn't figure it out.
        // https://github.com/naver/billboard.js/issues/1015
        result = $("<div>").appendTo($(".pvtRendererArea"));
        params.bindto = result[0];
        bb.generate(params);
        result.detach();
        return $("<div>").append(title, result);
      };
    };
    return $.pivotUtilities.bb_renderers = {
      "Horizontal Bar Chart": makeBBChart({
        type: "bar",
        horizontal: true
      }),
      "Horizontal Stacked Bar Chart": makeBBChart({
        type: "bar",
        stacked: true,
        horizontal: true
      }),
      "Bar Chart": makeBBChart({
        type: "bar"
      }),
      "Stacked Bar Chart": makeBBChart({
        type: "bar",
        stacked: true
      }),
      "Line Chart": makeBBChart(),
      "Area Chart": makeBBChart({
        type: "area",
        stacked: true
      }),
      "Scatter Chart": makeBBChart({
        type: "scatter"
      })
    };
  });

}).call(this);

//# sourceMappingURL=bb_renderers.js.map
