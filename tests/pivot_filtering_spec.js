const fixtureData = [
  ["name", "gender", "colour", "birthday", "trials", "successes"],
  ["Nick", "male", "blue", "1982-11-07", 103, 12],
  ["Jane", "female", "red", "1982-11-08", 95, 25],
  ["John", "male", "blue", "1982-12-08", 112, 30],
  ["Carol", "female", "yellow", "1983-12-08", 102, 14],
];

describe("Attribute Values Filtering:", () => {
  const OPEN_BUTTON_SELECTOR = ".axis_0 .pvtTriangle";
  const DIALOG_SELECTOR = ".pvtAttrValuesBox";

  describe("The filtering dialog", () => {
    let table, options;

    beforeEach((done) => {
      options = {
        rows: ["name"],
        cols: ["gender"],
        aggregatorName: "Count",
        rendererName: "Table",
        onRefresh: (() => done()),
      };
      table = $("<div>").pivotUI(fixtureData, options);
      // table.hide(); // hide the container so jasmine UI doesn't get cluttered
      document.body.insertAdjacentElement("afterbegin", table[0]);

      // open the dialog
      const openBtn = table.find(OPEN_BUTTON_SELECTOR);
      if (!openBtn) {
        fail(`open button with selector ${OPEN_BUTTON_SELECTOR} not found.`);
      }
      openBtn.trigger("click");
    });

    afterEach(() => {
      document.body.removeChild(table[0]);
    });

    it("opens and gets created successfully", (done) => {
      const dialog = table.find(DIALOG_SELECTOR);
      expect(dialog.length).toBe(1);
      done();
    });
    it("closes and is removed from the DOM when clicked outside", (done) => {
      const dialog = document.querySelector(DIALOG_SELECTOR);
      // click outside the dialog
      dialog.close();
      setTimeout(() => {
        // For some reason the dialog doesn't get removed immediately, so add some delay
        expect(document.querySelector(DIALOG_SELECTOR)).toBe(null);
        done();
      }, 100);
    });
    it("renders values list", () => {
      const valuesList = document.querySelector(
        ".pvtAttrValuesBox .pvtCheckContainer",
      );
      expect(valuesList.children[0]).toBeInstanceOf(HTMLLIElement);
      expect(valuesList.children.length).toBeGreaterThan(0);
    });
    it("'select-none' then 'select all' selects all values", () => {
      const toolbarItems =
        document.querySelector(".toolbar__shortcuts").children;

      const valuesList = document.querySelector(
        ".pvtAttrValuesBox .pvtCheckContainer",
      );

      const selectAllBtn = (() => {
        for (let i = 0; i < toolbarItems.length; i++) {
          if (toolbarItems[i].innerText == "Select All") {
            return toolbarItems[i];
          }
        }
      })();

      const selectNoneBtn = (() => {
        for (let i = 0; i < toolbarItems.length; i++) {
          if (toolbarItems[i].innerText == "Select None") {
            return toolbarItems[i];
          }
        }
      })();

      selectNoneBtn.click();
      selectAllBtn.click();

      // Check if all values are checked
      const isAllValuesChecked = (() => {
        for (let i = 0; i < valuesList.children.length; i++) {
          const checkbox = valuesList.children[i].children[0]; // Assuming checkbox is the first child
          if (!checkbox.checked) { // If any checkbox is not checked
            return false;
          }
        }
        return true;
      })();

      expect(isAllValuesChecked).toBe(true); // Expect all checkboxes to be checked
    });
    it("'select-none' un-selects all values", () => {
      const toolbarItems =
        document.querySelector(".toolbar__shortcuts").children;

      const valuesList = document.querySelector(
        ".pvtAttrValuesBox .pvtCheckContainer",
      ).children;

      const selectNoneBtn = (() => {
        for (let i = 0; i < toolbarItems.length; i++) {
          if (toolbarItems[i].innerText == "Select None") {
            return toolbarItems[i];
          }
        }
      })();

      selectNoneBtn.click();

      // Check if all values are unchecked
      const isAllValuesChecked = (() => {
        for (let i = 0; i < valuesList.length; i++) {
          const checkbox = valuesList[0]; // Assuming checkbox is the first child
          if (!checkbox.checked) { // If any checkbox is not checked
            return false;
          }
        }
        return true;
      })();

      expect(isAllValuesChecked).toBe(false); // Expect all checkboxes to be checked
    });
    it("search field filters values correctly", () => {
      const searchField = document.querySelector(".pvtSearch");

      const valuesList = document.querySelector(
        ".pvtAttrValuesBox .pvtCheckContainer",
      ).children;

      // get the text of the first value
      const SEARCH_TERM = valuesList[0].innerText;

      // input it as search term
      searchField.value = SEARCH_TERM;
      searchField.dispatchEvent(new Event("keyup"));

      // exclude hidden items (items get hidden when filtered out)
      const visibleItems = (() => {
        let visible = [];
        for (let i = 0; i < valuesList.length; i++) {
          if (window.getComputedStyle(valuesList[i]).display != "none") {
            visible.push(valuesList[i]);
          }
        }
        return visible;
      })();

      // check that all the resulting values contain the search term (only non-hidden items)
      const isValuesFilteredCorrectly = (() => {
        // check the value of visible items
        return visibleItems.every((item) => {
          return item.innerText == SEARCH_TERM;
        });
      })();

      expect(isValuesFilteredCorrectly).toBe(true);
    });
  });

  // TODO
  //# The resulting pivot table
  //## renders correctly with excluded values
  //## renders correctly with "select none"
  //## renders correctly with "select none" then "select all"
});
