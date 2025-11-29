// NOTE: this renderer is only compatible with D3.js v7
/**
 * The default configurations of D3 renderer
 * @typedef {Object} D3defaults
 * @property {Object} localeStrings
 * @property {Object} d3
 */
/**
 * N-ary(generic) tree
 * @typedef {Object} GenericTree
 * @property {string} name
 * @property {N-aryTree[]} [children]
 */
/**
 * TreeMap data structure
 * @typedef {Object} TreeMap
 * @extends GenericTree
 * @property {number} [value] - the weight or importance of this node
 */
/**
 *  A single node of a treeMap entry data (the data that can be transformed into a treeMap)
 *  @typedef {Object} TreeMapDataNode
 *  @property {Array<string | number>} path - the path of the node
 *  @property {number} value - the value (importance/weight) of the node
 */

function uid(prefix) {
  // HACK this is not good and you should use strong UUIDs not math.random
  const id = Math.random().toString(36).substr(2, 9);
  if (prefix) {
    return `${prefix}-${id}`;
  }
  return id;
}

function callWithJQuery(pivotModule) {
  if (typeof exports === "object" && typeof module === "object") { // CommonJS
    pivotModule(require("jquery"), require("d3"));
  } else if (typeof define === "function" && define.amd) { // AMD
    define(["jquery", "d3"], pivotModule);
  } else { // Plain browser environment
    pivotModule(jQuery, d3);
  }
}

/**
 * @returns {D3defaults}
 */
const initializeDefaults = ($) => ({
  localeStrings: {},
  d3: {
    width: () => $(window).width(),
    height: () => $(window).height(),
  },
});

const defaultTree = {
  name: "All",
  children: [],
};

/**
 * Convert PivotData to treemap input data
 * @returns {TreeMapDataNode[]}
 */
const pivotDataToTreemapInput = (pivotData) => {
  return pivotData.getRowKeys().map((rowKey) => {
    // Convert all node names to string
    const rowKeyStr = rowKey.map(String);
    // Each rowKey is the path of the node
    return {
      path: rowKeyStr,
      value: pivotData.getAggregator(rowKey, []).value(),
    };
  });
};

/** Recursive function to create or update nested structure
 * @param {TreeMap} currentNode
 * @path {string | number} path
 * @value {number} value
 * @returns {TreeMap}
 */
const addSubtreeToTree = (currentNode, path, value) => {
  if (path.length === 0) {
    // arrived at the last node
    return {
      ...currentNode,
      value,
    };
  }

  const [currentSegment, ...remainingPath] = path;

  // Find or create child
  const existingChildIndex = currentNode.children
    .findIndex((child) => child.name === currentSegment);

  const updatedChildren = existingChildIndex !== -1
    ? currentNode.children.map((child, index) =>
      // update existing child tree
      index === existingChildIndex
        ? addSubtreeToTree(child, remainingPath, value)
        : child
    )
    : [ // create child tree
      ...currentNode.children,
      addSubtreeToTree(
        { name: currentSegment, children: [] },
        remainingPath,
        value,
      ),
    ];

  return {
    ...currentNode,
    children: updatedChildren,
  };
};

/**
 * Create the data structure of treeMap
 * @param {TreeMap} defaultTree
 * @param {TreeMapDataNode[]} entries
 * @returns {TreeMap}
 */
const createTreeMap = (
  defaultTree = { name: "All", children: [] },
  entries,
) => {
  return entries.reduce((tree, entry) => {
    // Perform the update on the tree
    return addSubtreeToTree(tree, entry.path, entry.value);
  }, defaultTree);
};

/**
 * @param {Treemap}  data
 */
const renderTreeMap = (data, width, height) => {
  const color = d3.scaleSequential([8, 0], d3.interpolateMagma);

  // Create the treemap layout.
  const treemap = (data) =>
    d3.treemap()
      .size([width, height])
      .paddingOuter(3)
      .paddingTop(19)
      .paddingInner(1)
      .round(true)(
        d3.hierarchy(data)
          .sum((d) => d.value)
          .sort((a, b) => b.value - a.value),
      );
  const root = treemap(data);

  // Create the SVG container.
  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr(
      "style",
      "max-width: 100%; height: auto; overflow: visible; font: 10px sans-serif;",
    );

  const node = svg.selectAll("g")
    .data(d3.group(root, (d) => d.height))
    .join("g")
    .selectAll("g")
    .data((d) => d[1])
    .join("g")
    .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

  const format = d3.format(",d");

  node.append("title")
    .text((d) =>
      `${d.ancestors().reverse().map((d) => d.data.name).join("/")}\n${
        format(d.value)
      }`
    );

  node.append("rect")
    .attr("id", (d) => d.nodeUid = uid("node"))
    .attr("fill", (d) => color(d.height))
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0);

  node.append("clipPath")
    .attr("id", (d) => d.clipUid = uid("clip"))
    .append("use")
    .attr("xlink:href", (d) => `#${d.nodeUid}`);

  node.append("text")
    .attr("clip-path", (d) => `url(#${d.clipUid})`)
    .selectAll("tspan")
    .data((d) => d.data.name.split(/(?=[A-Z][^A-Z])/g).concat(format(d.value)))
    .join("tspan")
    .attr("fill-opacity", (d, i, nodes) => i === nodes.length - 1 ? 0.7 : null)
    .text((d) => d);

  node.filter((d) => d.children).selectAll("tspan")
    .attr("dx", 3)
    .attr("y", 13);

  node.filter((d) => !d.children).selectAll("tspan")
    .attr("x", 3)
    .attr(
      "y",
      (d, i, nodes) => `${(i === nodes.length - 1) * 0.3 + 1.1 + i * 0.9}em`,
    );

  return svg.node();
};

/**
 * @param {Treemap}  data
 */
const renderTreeMapUI = (renderedTreemap) => {
  // const tile = Inputs.select(
  //   new Map([
  //     ["squarify", d3.treemapSquarify],
  //     ["binary", d3.treemapBinary],
  //     ["slice-dice", d3.treemapSliceDice],
  //     ["slice", d3.treemapSlice],
  //     ["dice", d3.treemapDice],
  //   ]),
  //   { label: "Tiling method", value: d3.treemapBinary },
  // );
  const result = $("<div>").css({ width: "100%", height: "100%" });
  result.append(renderedTreemap);

  return result;
};

const createD3Renderers = ($, d3) => {
  const renderers = {
    TreeMap: (pivotData, opts) => {
      // try {
      const defaults = initializeDefaults($);
      opts = $.extend(true, {}, defaults, opts);

      const treemapInputData = pivotDataToTreemapInput(pivotData);
      const treeMapData = createTreeMap(defaultTree, treemapInputData);
      const treeMap = renderTreeMap(
        treeMapData,
        opts.d3.width(),
        opts.d3.height(),
      );
      const treeMapUI = renderTreeMapUI(treeMap);
      return treeMapUI;
    },
  };
  return renderers;
};

callWithJQuery(($, d3) => {
  $.pivotUtilities.d3_renderers = createD3Renderers($, d3);
});
