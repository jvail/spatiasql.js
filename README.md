# spatiasql.js

Experimental JavaScript (emscripten) port of [SpatiaLite 4.3.0a](https://www.gaia-gis.it/fossil/libspatialite/index)

[![Build Status](https://travis-ci.org/jvail/spatiasql.js.svg?branch=master)](https://travis-ci.org/jvail/spatiasql.js)

## Demo
A little web-worker demo is available from here: http://jvail.github.io/spatiasql.js/
<br>(be patient, loading the js and database file takes some time).

## Usage
spatiasql.js (SpatiaLite) is an extension of [sql.js](https://github.com/kripken/sql.js/) (SQLite) and implements the same [API](https://github.com/kripken/sql.js/#usage), exept:

 - loading shapefiles:
```js
var fs = require('fs');
var SQL = require('spatiasql');
var db = new SQL.Database();

db.loadshp('my_table', 'CP1251', 4326, {
  shp: fs.readFileSync('my_shp.shp'),
  shx: fs.readFileSync('my_shp.shx'),
  dbf: fs.readFileSync('my_shp.dbf')
});

var res = db.exec('SELECT name, GeometryType(geometry) FROM my_table');
```

## License
Same license as [SpatiaLite](https://www.gaia-gis.it/fossil/libspatialite/index).
