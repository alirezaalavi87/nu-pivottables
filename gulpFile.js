import { dest, parallel, series, src, watch } from "gulp"; // Updated imports
import filter from "gulp-filter";
import uglify from "gulp-uglify";
import git from "gulp-git";
import bump from "gulp-bump";
import tagVersion from "gulp-tag-version"; // Updated import name
import { spawn } from "child_process";
import coffee from "gulp-coffee";
import minifyCSS from "gulp-clean-css"; // Updated package
import sourcemaps from "gulp-sourcemaps";
import rename from "gulp-rename";
import { exec } from "child_process";

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
    .pipe(dest("./dist")) // copy original files to dist
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

const inc = (importance) => {
  // get all the files to bump version in
  return src(["./package.json", "./bower.json"])
    // bump the version number in those files
    .pipe(bump({ type: importance }))
    // save it back to filesystem
    .pipe(dest("./"));
};

const publish = (done) => {
  spawn("npm", ["publish"], { stdio: "inherit" }).on("close", done);
};

const push = (done) => {
  git.push("origin", "master", { args: "--tags" }, function (err) {
    if (err) throw err;
    done();
  });
};

const tag = () => {
  return src(["./package.json", "./bower.json"])
    .pipe(git.commit("version bump"))
    .pipe(filter("package.json"))
    .pipe(tagVersion());
};

const bumpPatch = () => inc("patch");
const bumpMinor = () => inc("minor");
const bumpMajor = () => inc("major");

const patch = series(
  bumpPatch,
  parallel(makeJs, makeCss),
  tag,
  /*publish,*/ push,
);
const minor = series(
  bumpMinor,
  parallel(makeJs, makeCss),
  tag,
  /*publish,*/ push,
);
const major = series(
  bumpMajor,
  parallel(makeJs, makeCss),
  tag,
  /*publish,*/ push,
);

const watchFiles = () => {
  watch(["./src/*.coffee", "./locales/*.coffee", "./tests/*.coffee"], makeJs);
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
  bumpMajor,
  bumpMinor,
  bumpPatch,
  defaultTask as default,
  major,
  makeCss,
  makeJs,
  minor,
  patch,
  processPlainJs,
  serve,
  watchFiles as watch,
};
