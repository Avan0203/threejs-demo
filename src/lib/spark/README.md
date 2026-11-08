# Spark vendor files

The browser runtime in `dist/spark.module.js` is copied from
`@sparkjsdev/spark@2.3.1`. Its Worker code, WASM data, and `fflate` code are
bundled into that module.

The module imports `three` and `three/addons/postprocessing/Pass.js`. Static
pages that use it must map both specifiers to the matching local Three.js
revision. This project uses the vendored Three.js r182 files in `src/lib/three`.

The upstream Spark license and the bundled `fflate` license are included in
this directory.
