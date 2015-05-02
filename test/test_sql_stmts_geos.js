var fs = require('fs');
var SQL = require('../js/spatiasql');
var db_name = ':memory:'; // 'test.sqlite';
// var filebuffer = fs.readFileSync('test.sqlite');
var filebuffer = fs.readFileSync('sql_stmt_tests/testdb1.sqlite');
var noFailed = 0;
var noCases = 0;
var caseFailed = [];

// Load the db - spatialindex.testcase fails with :memory:
// var db = new SQL.Database(':memory:');
var db = new SQL.Database();
var dbs = {
	':memory:': db
};

// console.log('\n');
// console.log('sqlite_version ' + db.exec("SELECT sqlite_version()")[0].values[0]);
// console.log('spatialite_version ' + db.exec("SELECT spatialite_version()")[0].values[0]);
// console.log('proj4_version ' + db.exec("SELECT proj4_version()")[0].values[0]);
// console.log('geos_version ' + db.exec("SELECT geos_version()")[0].values[0]);
// console.log('lwgeom_version ' + db.exec("SELECT lwgeom_version()")[0].values[0]);
// console.log('libxml2_version ' + db.exec("SELECT libxml2_version()")[0].values[0]);
// console.log('HasIconv ' + db.exec("SELECT HasIconv()")[0].values[0]);
// console.log('HasMathSQL ' + db.exec("SELECT HasMathSQL()")[0].values[0]);
// console.log('HasGeoCallbacks ' + db.exec("SELECT HasGeoCallbacks()")[0].values[0]);
// console.log('HasProj ' + db.exec("SELECT HasProj()")[0].values[0]);
// console.log('HasGeos ' + db.exec("SELECT HasGeos()")[0].values[0]);
// console.log('HasGeosAdvanced ' + db.exec("SELECT HasGeosAdvanced()")[0].values[0]);
// console.log('HasGeosTrunk ' + db.exec("SELECT HasGeosTrunk()")[0].values[0]);
// console.log('HasLwGeom ' + db.exec("SELECT HasLwGeom()")[0].values[0]);
// console.log('HasLibXML2 ' + db.exec("SELECT HasLibXML2()")[0].values[0]);
// console.log('HasEpsg ' + db.exec("SELECT HasEpsg()")[0].values[0]);
// console.log('HasFreeXL ' + db.exec("SELECT HasFreeXL()")[0].values[0]);
// console.log('HasGeoPackage ' + db.exec("SELECT HasGeoPackage()")[0].values[0]);
console.log('\n');

console.log(JSON.stringify(db.exec("SELECT InitSpatialMetaData()"), null, 2));

var testcases = fs.readdirSync('sql_stmt_geos_tests');
for (var i = 0, is = testcases.length; i < is; i++) {

	if (testcases[i].indexOf('.testcase') < 0 || !fs.lstatSync('sql_stmt_geos_tests/' + testcases[i]).isFile())
		continue;
	var testcase = fs.readFileSync('sql_stmt_geos_tests/' + testcases[i], { encoding: 'utf-8' });
	if (testcase.length > 0) {
		noCases++;
		console.log('\n\nfile: ' + testcases[i]);
		var lines = testcase.split('\n');
		var title = lines[0];

		if (lines[1].substr(0, (lines[1].indexOf('#') < 0 ? lines[1].length : lines[1].indexOf('#'))).trim() !== db_name) {

			if (lines[1].indexOf(':memory:') < 0) {
				db_name = lines[1].substr(0, (lines[1].indexOf('#') < 0 ? lines[1].length : lines[1].indexOf('#'))).trim();
				if (!dbs[db_name]) {
					db = new SQL.Database(fs.readFileSync(db_name));
					dbs[db_name] = db;
				}	else {
					db = dbs[db_name];
				}
			} else {
				db = dbs[':memory:'];
			}

		}

		var stmt = lines[2];
		var rows = Number(lines[3].split(' ')[0]);
		var cols = Number(lines[4].split(' ')[0]);
		var expect = lines.slice(5 + cols);
		// console.log(stmt);
		var res = db.exec(stmt);
		// console.log(JSON.stringify(res, null, 2));
		console.log('testcase: ' + title);
		for (var j = 0; j < res[0].values[0].length; j++) {
			if (expect[j].trim() === '(NULL)')
				expect[j] = null;
			else // remove comments (#)
				expect[j] = expect[j].substr(0, (expect[j].indexOf('#') < 0 ? expect[j].length : expect[j].indexOf('#'))).trim();

			if (!isNaN(parseFloat(res[0].values[0][j]))) {
				// TODO: split "expect" at ':'' add precision
				res[0].values[0][j] = parseFloat(res[0].values[0][j]).toFixed();  // simply round
				expect[j] = parseFloat(expect[j]).toFixed();
			} else if (typeof expect[j] === 'string') {
				// remove ':X' (precision) from end of stmt
				if (expect[j].lastIndexOf(':') === expect[j].length - 2)
					expect[j] = expect[j].substr(0, expect[j].lastIndexOf(':'));
			}

			console.log('expected:\n ' + expect[j]);
			console.log('found:\n ' + res[0].values[0][j]);
			if (res[0].values[0][j] != expect[j]) {
				console.log('column: ' + j + ' ERROR');
				noFailed++;
				caseFailed.push(testcases[i])
			} else {
				console.log('column: ' + j + ' OK');
			}
		}		
	}
}

console.log('\n' + noFailed + ' of ' + noCases + ' tests failed:\n\n' + caseFailed.join('\n'));

Object.keys(dbs).forEach(function (db) {
	dbs[db].close();
});



