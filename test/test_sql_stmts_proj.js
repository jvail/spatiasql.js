var fs = require('fs');
var SQL = require('../js/spatiasql');
var db_name = '';
var noFailed = 0;
var noCases = 0;
var caseFailed = [];

var db = new SQL.Database();
var db_memory = new SQL.Database();

console.log(JSON.stringify(db_memory.exec("SELECT InitSpatialMetaData()"), null, 2));

var testcases = fs.readdirSync('sql_stmt_proj_tests');
for (var i = 0, is = testcases.length; i < is; i++) {

  if (testcases[i].indexOf('.testcase') < 0 || !fs.lstatSync('sql_stmt_proj_tests/' + testcases[i]).isFile())
    continue;
  var testcase = fs.readFileSync('sql_stmt_proj_tests/' + testcases[i], { encoding: 'utf-8' });
  if (testcase.length > 0) {
    noCases++;
    console.log('\n\nfile: ' + testcases[i]);
    var lines = testcase.split('\n');
    var title = lines[0];

    if (db_name !== ':memory:')
      db.close();
    db_name = lines[1].substr(0, (lines[1].indexOf('#') < 0 ? lines[1].length : lines[1].indexOf('#'))).trim();
    if (db_name.indexOf('NEW:memory:') > -1)
      db = new SQL.Database();
    else if (db_name === ':memory:')
      db = db_memory;
    else
      db = new SQL.Database(fs.readFileSync(db_name));

    var stmt = lines[2];
    var rows = parseInt(lines[3].split(' ')[0]);
    var cols = parseInt(lines[4].split(' ')[0]);
    var expect = lines.slice(5 + cols);
    var res = db.exec(stmt);
    console.log('testcase: ' + title);
    console.log('db: ' + db_name);
    console.log('res: ', JSON.stringify(res, null, 2));

    for (var r = 0; r < res[0].values.length; r++) {
      for (var c = 0; c < res[0].values[r].length; c++) {
        var idx = r * cols + c; 
        if (expect[idx].trim() === '(NULL)')
          expect[idx] = null;
        else // remove comments (#)
          expect[idx] = expect[idx].substr(0, (expect[idx].indexOf('#') < 0 ? expect[idx].length : expect[idx].indexOf('#'))).trim();

        if (!isNaN(parseFloat(res[0].values[r][c]))) {
          // TODO: split "expect" at ':'' add precision
          res[0].values[r][c] = parseFloat(res[0].values[r][c]).toFixed();  // simply round
          expect[idx] = parseFloat(expect[idx]).toFixed();
        } else if (typeof expect[idx] === 'string') {
          // remove ':X' (precision) from end of stmt
          if (expect[idx].lastIndexOf(':') === expect[idx].length - 2)
            expect[idx] = expect[idx].substr(0, expect[idx].lastIndexOf(':'));
        }

        console.log('expected:\n ' + expect[idx]);
        console.log('found:\n ' + res[0].values[r][c]);
        if (res[0].values[r][c] != expect[idx]) {
          console.log('column/row: ' + c + '/' + r + ' ERROR');
          if (caseFailed.indexOf(testcases[i]) < 0) {
            noFailed++;
            caseFailed.push(testcases[i])
          }
        } else {
          console.log('column/row: ' + c + '/' + r + ' OK');
        }
      }
    }   
  }
}

console.log('\n' + noFailed + ' of ' + noCases + ' tests failed:\n\n' + caseFailed.join('\n'));

if (db_memory.db)
  db_memory.close();
if (db.db)
  db.close();



