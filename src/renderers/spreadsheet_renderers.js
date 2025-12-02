function callWithJQuery(pivotModule) {
  if (typeof exports === "object" && typeof module === "object") { // CommonJS
    pivotModule(require("jquery"), require("exceljs"));
  } else if (typeof define === "function" && define.amd) { // AMD
    define(["jquery", "exceljs"], pivotModule);
  } else { // Plain browser environment
    pivotModule(jQuery, ExcelJS);
  }
}

const createWorkBookXLSX = (
  handler,
  options = { creator: "nu-pivottables" },
) => {
  const wb = new handler.Workbook();
  wb.creator = options.creator;

  return wb;
};

const addWorkSheetToWorkBookXLSX = (workbook, sheetName) => {
  return workbook.addWorksheet(sheetName);
};

const addRowsToWorksheet = (worksheet, input) => {
  worksheet.addRows(input);
  return worksheet;
};

const addPivotTableToWorksheet = (
  worksheet,
  { sourceSheet, rows, columns, values, metric = "sum" },
) => {
  return worksheet.addPivotTable({
    sourceSheet,
    rows,
    columns,
    values,
    metric,
  });
};

/**
 * @param {object} workbook
 * @returns {Promise<Buffer>}
 */
const workbookToXLSXFile = (workbook) => {
  try {
    const buf = workbook.xlsx.writeBuffer();

    return buf;
  } catch (err) {
    throw new Error("Error while writing to the XLSX file: ", err);
  }
};

/**
 * Given a spreadsheet input, calculate the columns for that input, according
 * to the requirements of the spreadsheet handler
 * @param {Object[]} input
 * @returns {Object[]}
 */
const columnsFromObjectInput = (input) => {
  return Object.keys(input[0]).map((key) => ({
    header: key,
    key: key,
  }));
};

/**
 * calculate the "values" for pivot table.
 * @returns {string[]}
 */
const pivotValues = (pivotData) => {
  // NOTE this is just how nu-pivottables behaves (use the first row attribute or col attribute as pivot value)
  if (pivotData?.rowAttrs.length) {
    return [pivotData.rowAttrs[0]];
  }
  if (pivotData?.colAttrs.length) {
    return [pivotData.colAttrs[0]];
  }
};

/**
 * Process the pivotData with the xlsxHandler and create XLSX file
 * @returns {Promise<Blob>}
 */
const createXLSXFile = async (xlsxHandler, pivotData) => {
  try {
    const fullInput = pivotData.input;
    const workbook = createWorkBookXLSX(xlsxHandler);
    const fullWorksheet = addWorkSheetToWorkBookXLSX(
      workbook,
      "Full Data",
    );
    // You have to verbosely define the columns, even though the input format itself
    // is a well-defined spreadsheet. This is just how Excel.js behaves.
    fullWorksheet.columns = columnsFromObjectInput(fullInput);
    addRowsToWorksheet(fullWorksheet, fullInput);
    const pivotWorksheet = addWorkSheetToWorkBookXLSX(workbook, "Pivot table");
    addPivotTableToWorksheet(
      pivotWorksheet,
      {
        sourceSheet: fullWorksheet,
        rows: pivotData.rowAttrs ?? [],
        columns: pivotData.colAttrs ?? [],
        values: pivotValues(pivotData),
        metric: "sum", // NOTE `ExcelJS` accepts 'sum' only for now
      },
    );
    const xlsxBuffer = await workbookToXLSXFile(workbook);
    const xlsxFile = new Blob([xlsxBuffer], {
      type: "application/octet-stream",
    });

    return xlsxFile;
  } catch (err) {
    console.error(err);
  }
};

/**
 * @returns {HTMLElement}
 */
const createDownloadLink = (file, fileName, opts) => {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.textContent = opts.localeStrings.exportXLSX;
  a.href = url;
  a.download = fileName;

  return a;
};

const makeXLSXExport = ($, xlsxHandler) => {
  return async (pivotData, opts) => {
    defaults = {
      localeStrings: {
        exportXLSX: "Export XLSX",
      },
    };
    opts = $.extend(true, {}, defaults, opts);
    const xlsxFile = await createXLSXFile(xlsxHandler, pivotData);

    /* render the UI */
    const XLSXDownloadLink = createDownloadLink(
      xlsxFile,
      "nu-pivottables-export.xlsx",
      opts,
    );
    const resultUI = $("<div>")
      .addClass("spreadsheet-downloads")
      .append(XLSXDownloadLink);

    return resultUI;
  };
};

callWithJQuery(($, ExcelJS) => {
  $.pivotUtilities.spreadsheet_renderers = {
    "XLSX export": makeXLSXExport($, ExcelJS),
  };
});
