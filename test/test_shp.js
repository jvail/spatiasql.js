var fs = require('fs');
var SQL = require('../dist/spatiasql')();
var db = new SQL.Database();

var str = function (q) {
  return JSON.stringify(q, null, 2);
}

var ret = db.loadshp('ne_110m_admin_0_countries', "CP1251", 4326, {
  shp: fs.readFileSync('shp/ne_110m_admin_0_countries.shp'),
  dbf: fs.readFileSync('shp/ne_110m_admin_0_countries.dbf'),
  shx: fs.readFileSync('shp/ne_110m_admin_0_countries.shx')
});

if (ret === 1) {
  console.log(str(db.exec('PRAGMA table_info("ne_110m_admin_0_countries")')));
  console.log(str(db.exec('SELECT name, GeometryType(geometry) FROM ne_110m_admin_0_countries')));
}
