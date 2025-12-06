callWithJQuery = (pivotModule) ->
    if typeof exports is "object" and typeof module is "object" # CommonJS
        pivotModule require("jquery"), require("bb")
    else if typeof define is "function" and define.amd # AMD
        define ["jquery", "bb"], pivotModule
    # Plain browser env
    else
        pivotModule jQuery, bb

callWithJQuery ($, bb) ->

    makeBBChart = (chartOpts = {}) -> (pivotData, opts) ->
        defaults =
            localeStrings: {vs: "vs", by: "by"}
            bb: {}

        opts = $.extend(true, {}, defaults, opts)
        opts.bb.size ?= {}
        opts.bb.size.width ?= window.innerWidth
        opts.bb.size.height ?= window.innerHeight
        chartOpts.type ?= "line"
        chartOpts.horizontal ?= false
        chartOpts.stacked ?= false

        rowKeys = pivotData.getRowKeys()
        rowKeys.push [] if rowKeys.length == 0
        colKeys = pivotData.getColKeys()
        colKeys.push [] if colKeys.length == 0

        headers = (h.join("-") for h in colKeys)
        rotationAngle = 0

        fullAggName = pivotData.aggregatorName
        if pivotData.valAttrs.length
            fullAggName += "(#{pivotData.valAttrs.join(", ")})"

        if chartOpts.type == "scatter"
            scatterData = x:{}, y:{}, t:{}
            attrs = pivotData.rowAttrs.concat(pivotData.colAttrs)
            vAxisTitle = attrs[0] ? ""
            hAxisTitle = attrs[1] ? ""
            groupByTitle = attrs.slice(2).join("-")
            titleText = vAxisTitle
            titleText += " #{opts.localeStrings.vs} #{hAxisTitle}" if hAxisTitle != ""
            titleText += " #{opts.localeStrings.by} #{groupByTitle}" if groupByTitle != ""
            for rowKey in rowKeys
                for colKey in colKeys
                    agg = pivotData.getAggregator(rowKey, colKey)
                    if agg.value()?
                        vals = rowKey.concat(colKey)
                        series = vals.slice(2).join("-")
                        if series == "" then series = "series"
                        scatterData.x[series] ?= []
                        scatterData.y[series] ?= []
                        y = vals[0] ? 0
                        x = vals[1] ? 0
                        scatterData.y[series].push y
                        scatterData.x[series].push x
                        scatterData.t[series] ?= {}
                        scatterData.t[series][x] ?= {}
                        scatterData.t[series][x][y] = agg.value()
        else
            numCharsInHAxis = 0
            for x in headers
                numCharsInHAxis += x.length
            if numCharsInHAxis > 50
                rotationAngle = 45

            columns = []
            for rowKey in rowKeys
                rowHeader = rowKey.join("-")
                row = [if rowHeader == "" then fullAggName else rowHeader]
                for colKey in colKeys
                    val = parseFloat  pivotData.getAggregator(rowKey, colKey).value()
                    if isFinite(val)
                        row.push(val)
                    else
                        row.push(null)
                columns.push row

            vAxisTitle = fullAggName

            if chartOpts.horizontal
                hAxisTitle = pivotData.rowAttrs.join("-")
                groupByTitle = pivotData.colAttrs.join("-")
            else
                hAxisTitle = pivotData.colAttrs.join("-")
                groupByTitle = pivotData.rowAttrs.join("-")
            titleText = fullAggName
            titleText += " #{opts.localeStrings.vs} #{hAxisTitle}" if hAxisTitle != ""
            titleText += " #{opts.localeStrings.by} #{groupByTitle}" if groupByTitle != ""

        title = $("<p>", {style: "text-align: center; font-weight: bold"})
        title.attr("dir", "auto")
        title.text(titleText)

        formatter = pivotData.getAggregator([], []).format

        params =
            axis:
                rotated: chartOpts.horizontal
                y:
                    label: vAxisTitle
                    tick: {}
                x:
                    label: hAxisTitle
                    tick:
                        rotate: rotationAngle
                        multiline: false
            data:
                type: chartOpts.type
                order: null
            tooltip:
                grouped: false
            color:
                pattern: [ "#3366cc", "#dc3912", "#ff9900", "#109618",
                           "#990099", "#0099c6", "#dd4477", "#66aa00",
                           "#b82e2e", "#316395", "#994499", "#22aa99",
                           "#aaaa11", "#6633cc", "#e67300", "#8b0707",
                           "#651067", "#329262", "#5574a6", "#3b3eac" ]


        params = $.extend(true, {}, params, opts.bb)
        if chartOpts.type == "scatter"
            xs = {}
            numSeries = 0
            dataColumns = []
            for s of scatterData.x
                numSeries += 1
                xs[s] = s+"_x"
                dataColumns.push [s+"_x"].concat(scatterData.x[s])
                dataColumns.push [s].concat(scatterData.y[s])
            params.data.xs = xs
            params.data.columns = dataColumns
            params.axis.x.tick = fit: false
            if numSeries == 1
                params.legend = show: false
            params.tooltip.format =
                title: -> fullAggName
                name: -> ""
                value: (a,b,c,d,e) ->
                    {name: series, value: y, x} = e[0]
                    formatter(scatterData.t[series][x][y])
        else
            params.axis.x.type= 'category'
            params.axis.y.tick.format ?= (v) -> formatter(v)
            params.tooltip.format = value: (v) -> formatter(v)

            if chartOpts.horizontal
                categories = (c.shift() for c in columns)
                if categories.length == 1 and categories[0] == fullAggName
                    categories = [""]
                params.axis.x.categories = categories
                if headers.length == 1 and headers[0] == ""
                    headers = [fullAggName]
                columns.unshift(headers)
                params.data.rows = columns
            else
                params.axis.x.categories = headers
                params.data.columns = columns


        if chartOpts.stacked
            if chartOpts.horizontal
                params.data.groups = [x.join("-") for x in colKeys]
                console.log params.data.groups
            else
                params.data.groups = [x.join("-") for x in rowKeys]

        renderArea = $("<div>", style: "display:none;").appendTo $("body")
        result = $("<div>").appendTo renderArea
        params.bindto = result[0]
        bb.generate params
        result.detach()
        renderArea.remove()
        return $("<div>").append title, result

    $.pivotUtilities.bb_renderers =
        "Horizontal Bar Chart": makeBBChart(type: "bar", horizontal: true)
        "Horizontal Stacked Bar Chart": makeBBChart(type: "bar", stacked: true, horizontal: true)
        "Bar Chart": makeBBChart(type: "bar")
        "Stacked Bar Chart": makeBBChart(type: "bar", stacked: true)
        "Line Chart": makeBBChart()
        "Area Chart": makeBBChart(type: "area", stacked: true)
        "Scatter Chart": makeBBChart(type: "scatter")
