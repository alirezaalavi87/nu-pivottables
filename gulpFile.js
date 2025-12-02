import { dest, parallel, series, src, watch } from "gulp";
import filter from "gulp-filter";
import uglify from "gulp-uglify";
import coffee from "gulp-coffee";
import minifyCSS from "gulp-clean-css";
import sourcemaps from "gulp-sourcemaps";
import rename from "gulp-rename";
import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync, writeFileSync } from "fs";

const execPromise = promisify(exec);

// Define the tasks using async functions
const makeCss = () => {
  return src("./dist/pivot.css")
    .pipe(minifyCSS())
    .pipe(rename({ suffix: ".min" }))
    .pipe(dest("./dist/"));
};

const processCoffeeScript = () => {
  return src([
    "./src/*.coffee",
    "./src/renderers/*.coffee",
    "./locales/*.coffee",
    "./tests/*.coffee",
  ])
    .pipe(sourcemaps.init())
    .pipe(coffee()).on("error", console.error.bind(console))
    .pipe(sourcemaps.write("./"))
    .pipe(dest("./dist"))
    .pipe(filter("*.js"))
    .pipe(rename({ suffix: ".min" }))
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(uglify())
    .pipe(sourcemaps.write("./"))
    .pipe(dest("./dist"))
    .on("error", (err) => {
      console.error("Error while processing coffeescirpt files: ", err);
    });
};

const processPlainJs = () => {
  return src([
    "./src/**/*.js",
  ]).pipe(sourcemaps.init())
    .pipe(uglify())
    .pipe(rename((path) => {
      path.dirname = ""; // Remove directory structure
      path.basename += ".min";
    }))
    .pipe(dest("./dist"))
    .on("error", (err) => {
      console.error("Error while processing plain JS files: ", err);
    });
};

const makeJs = parallel(processPlainJs, processCoffeeScript);

const getBumpedVersion = async () => {
  try {
    const { stdout } = await execPromise("git cliff --bumped-version");
    return stdout.trim();
  } catch (err) {
    console.error("Error getting bumped version:", err);
    throw err;
  }
};

const bumpVersion = async () => {
  try {
    const version = await getBumpedVersion();
    // get bumped version
    console.log("Bumped Version:", version);
    // get the current package-json
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    packageJson.version = version;
    // Write back to package.json
    writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
    console.log(`Updated package.json version to ${version}`);
  } catch (err) {
    console.error("Error getting bumped version:", err);
  }
};

const generateChangelog = async () => {
  try {
    await execPromise("git cliff --bump -o CHANGELOG.md");
    console.log("Changelog generated successfully");
  } catch (err) {
    console.error("Error generating changelog:", err);
  }
};

const tagGit = async () => {
  try {
    const v = await getBumpedVersion();
    await execPromise("git add .");
    await execPromise(`git commit -m "Bump version to ${v} + CHANGELOG"`);
    await execPromise(`git tag ${v}`);

    console.log(`Created commit and tag for version ${v}`);
  } catch (err) {
    console.error("Error in git commit and tag:", err);
  }
};

const tag = async (cb) => {
  parallel(makeCss, makeJs);
  //TODO verify if test are being passed
  await bumpVersion();
  await generateChangelog();
  // Do the git operations (create commit, tag etc.)
  await tagGit();

  cb();
};

// TODO
// const release = async (cb) => {
//
// }

const watchFiles = () => {
  watch([
    "./src/*.coffee",
    "./locales/*.coffee",
    "./tests/*.coffee",
    "./src/**/*.js",
    "./locales/*.js",
    "./tests/*.js",
  ], makeJs);
  watch("./dist/pivot.css", makeCss);
};

const serve = (done) => {
  exec("./node_modules/http-server/bin/http-server .", (err) => {
    if (err) throw err;
    done();
  });
  console.log("server available on http://localhost:8080");
};

const defaultTask = parallel(makeJs, makeCss);

export {
  defaultTask as default,
  makeCss,
  makeJs,
  serve,
  tag,
  watchFiles as watch,
};
