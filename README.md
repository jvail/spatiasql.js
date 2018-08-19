# spatiasql.js

JavaScript (emscripten) port of [SpatiaLite 5.0.0-beta](https://www.gaia-gis.it/fossil/libspatialite/index) (including SQLite 3.24.0, proj 5.1.0, geos 3.6.2)

[![Build Status](https://travis-ci.org/jvail/spatiasql.js.svg?branch=master)](https://travis-ci.org/jvail/spatiasql.js)

## Demo
A demo (WebAssembly required) is available from here: http://jvail.github.io/spatiasql.js/

(be patient, loading the js and database file takes some time).

## Usage
spatiasql.js (SpatiaLite) is an extension of [sql.js](https://github.com/kripken/sql.js/) (SQLite) and implements the same (for node), but async API for the browser, exept:

 - loading shapefiles in node:
```js
const fs = require('fs');
const spatiasql = require('spatiasql-node');

spatiasql.then(Database => {

  const db = new Database();

  db.loadshp('my_table', 'CP1251', 4326, {
    shp: fs.readFileSync('my_file.shp'),
    shx: fs.readFileSync('my_file.shx'),
    dbf: fs.readFileSync('my_file.dbf')
  });

  let res = db.exec('SELECT * FROM my_table');
  console.log(res);

});
```

 - loading shapefiles in the browser:
```js
import { Database } from 'spatiasql';

const db = new Database();

const files = await Promise.all([
  fetch('my_file.shp').then(res => res.arrayBuffer()),
  fetch('my_file.shx').then(res => res.arrayBuffer()),
  fetch('my_file.dbf').then(res => res.arrayBuffer())
]);

const loaded = await db.loadshp('my_table', 'CP1251', 4326, {
    shp: files[0],
    shx: files[1],
    dbf: files[2]
  });

if (loaded) {
  db.exec('SELECT * FROM my_table')
    .then(res => console.log(res));
}

```

## angular, vue & webpack

The worker script (& wasm) file is expected to live in a 'lib' folder and may be copied with e.g. CopyWebpackPlugin.
See vue and angular examples:

* angular: https://github.com/jvail/spatialitebrowser
* vue: https://github.com/jvail/spatiasql-vue-test
