callWithJQuery = (pivotModule) ->
  if typeof exports is "object" and typeof module is "object" # CommonJS
    pivotModule require("jquery")
  else if typeof define is "function" and define.amd # AMD
    define ["jquery"], pivotModule
# Plain browser env
  else
    pivotModule jQuery

callWithJQuery ($) ->
  nf = $.pivotUtilities.numberFormat
  tpl = $.pivotUtilities.aggregatorTemplates

  frFmt =    nf(thousandsSep: " ", decimalSep: ".")
  frFmtInt = nf(digitsAfterDecimal: 0, thousandsSep: " ", decimalSep: ".")
  frFmtPct = nf(digitsAfterDecimal: 1, scaler: 100, suffix: "٪", thousandsSep: " ", decimalSep: ".")

  $.pivotUtilities.locales.fa =
    localeStrings:
      renderError: "در رندر کردن نتیجه ی جدول خطایی رخ داد."
      computeError: "در محاسبه ی نتیجه ی جدول خطایی رخ داد."
      uiRenderError: "در رندر کردن رابط کاربری جدول خطایی رخ داد."
      selectAll: "انتخاب همه"
      selectNone: "انتخاب هیچکدام"
      tooMany: "(مقدار لیست بیش از اندازه بزرگ است)"
      filterResults: "صافی مقادیر"
      apply: "اعمال تغییرات"
      cancel: "انصراف"
      totals: "مجموع"
      vs: "در مقابل"
      by: "بر حسب"

    aggregators:
      "تعداد":                             tpl.count(frFmtInt)
      "تعداد منحصر به فرد":             tpl.countUnique(frFmtInt)
      "لیست مقادیر منحصر به فرد":             tpl.listUnique(", ")
      "جمع":                              tpl.sum(frFmt)
      "جمع عددی":                       tpl.sum(frFmtInt)
      "میانگین":                              tpl.average(frFmt)
      "کمینه":                             tpl.min(frFmt)
      "بیشینه":                            tpl.max(frFmt)
      "مجموع جمع":                           tpl.sumOverSum(frFmt)
      "حد بالای ۸۰٪":               tpl.sumOverSumBound80(true, frFmt)
      "حد پایین ۸۰٪":               tpl.sumOverSumBound80(false, frFmt)
      "مجموع به نسبت کل":      tpl.fractionOf(tpl.sum(),   "total", frFmtPct)
      "مجموع به نسبت سطر ها":      tpl.fractionOf(tpl.sum(),   "row",   frFmtPct)
      "مجموع به نسبت ستون ها":   tpl.fractionOf(tpl.sum(),   "col",   frFmtPct)
      "تعداد به عنوان کسری از کل":     tpl.fractionOf(tpl.count(), "total", frFmtPct)
      "تعداد به عنوان کسری از سطرها":     tpl.fractionOf(tpl.count(), "row",   frFmtPct)
      "تعداد به عنوان کسری از ستون ها":  tpl.fractionOf(tpl.count(), "col",   frFmtPct)

    renderers:
      "جدول":                           $.pivotUtilities.renderers["Table"]
      "جدولِ نمودار میله ای":               $.pivotUtilities.renderers["Table Barchart"]
      "نقشه گرمایشی":                   $.pivotUtilities.renderers["Heatmap"]
      "نقشه گرمایشی سطری":         $.pivotUtilities.renderers["Row Heatmap"]
      "نقشه گرمایشی ستونی":       $.pivotUtilities.renderers["Col Heatmap"]
