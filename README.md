# spatiasql.js

Experimental\* JavaScript (emscripten) port of [SpatiaLite](https://www.gaia-gis.it/fossil/libspatialite/index)

\*_all sql_stmt.. tests (geos, proj, geopackage) pass_

##Demo
A little web-worker demo is available from here: http://jvail.github.io/spatiasql.js/
<br>(be patient, loading the js and database file takes some time).

##Usage
spatiasql.js (SpatiaLite) is an extension of [sql.js](https://github.com/kripken/sql.js/) (SQLite) and implements the same [API](https://github.com/kripken/sql.js/#usage), exept:

 - loading shapefiles:
```js
var fs = require('fs');
var SQL = require('spatiasql');
var db = new SQL.Database();

db.loadshp('ne_110m_admin_0_countries', 'CP1251', 4326, {
  shp: fs.readFileSync('ne_110m_admin_0_countries.shp'),
  dbf: fs.readFileSync('ne_110m_admin_0_countries.dbf'),
  shx: fs.readFileSync('ne_110m_admin_0_countries.shx')
});

var res = db.exec('SELECT name, GeometryType(geometry) FROM ne_110m_admin_0_countries');
```

##License
Same license as [SpatiaLite](https://www.gaia-gis.it/fossil/libspatialite/index).
