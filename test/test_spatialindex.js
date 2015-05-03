// modified example from http://www.gaia-gis.it/gaia-sins/splite-doxy-4.2.0/demo4_8c-example.html
var fs = require('fs');
var SQL = require('../js/spatiasql');
// var filebuffer = fs.readFileSync('sql_stmt_tests/testdb1.sqlite');
var db = new SQL.Database();
var result = null;
var count = 0;
var start = Date.now();

db.exec("SELECT InitSpatialMetadata(1)");
db.exec("CREATE TABLE test (PK INTEGER NOT NULL PRIMARY KEY)");
db.exec("SELECT AddGeometryColumn('test', 'geom', 3003, 'POINT', 2)");
db.exec("SELECT CreateMbrCache('test', 'geom')");
db.exec("BEGIN");

var stmt = db.prepare("INSERT INTO test (pk, geom) SELECT $pk, MakePoint($x, $y, $srid)");
var ix, iy, t0 = Date.now(), t1, pk = 0;
console.log("inserting 250000 rows");

for (ix = 0; ix < 500; ix++) {
  x = 1000000.0 + (ix * 10.0);
  for (iy = 0; iy < 500; iy++) {
    /* this double loop will insert 250 k rows into the the test table */
    y = 4000000.0 + (iy * 10.0);
    pk++;
    if ((pk % 10000) == 0) {
      t1 = Date.now();
      console.log('insert row: '+pk+'\t[elapsed time: '+((t1 - t0) / 1000)+']');
      t0 = Date.now();
    }
    stmt.bind({$pk:pk, $x:x, $y:y, $srid:3003 });
    stmt.step();
  }
}

stmt.free();

db.exec("COMMIT");
db.exec("ANALYZE test");

for (ix = 0; ix < 3; ix++) {
  console.log("performing test#"+ix+" - not using Spatial Index");
  /* 
    now we'll perform the spatial query WITHOUT using the Spatial Index
    we'll loop 3 times in order to avoid buffering-caching side effects
  */
  t0 = Date.now();
  result = db.exec("SELECT Count(*) FROM test WHERE MbrWithin(geom, BuildMbr(1000400.5, 4000400.5, 1000450.5, 4000450.5))");
  t1 = Date.now();
  console.log("Count(*) = "+result[0].values[0][0]+"\t[elapsed time: "+((t1 - t0) / 1000)+']');
}

for (ix = 0; ix < 3; ix++) {
  console.log("performing test#"+ix+" - using the MBR cache Spatial Index");
  /* 
    now we'll perform the spatial query USING the MBR cache Spatial Index
    we'll loop 3 times in order to avoid buffering-caching side effects
  */
  t0 = Date.now();
  result = db.exec("SELECT Count(*) FROM test WHERE ROWID IN (SELECT rowid FROM cache_test_geom WHERE mbr = FilterMbrWithin(1000400.5, 4000400.5, 1000450.5, 4000450.5))");
  t1 = Date.now();
  console.log("Count(*) = "+result[0].values[0][0]+"\t[elapsed time: "+((t1 - t0) / 1000)+']');
}

db.close();

console.log("[elapsed time: "+((Date.now() - start) / 1000)+']');
