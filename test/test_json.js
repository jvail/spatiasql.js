var fs = require('fs');
var args = require('process').argv.slice(2);
var assert = require('assert');

if (args[0] === 'wasm') {
  require('../dist/wasm/spatiasql')(tests, { pathWasm: 'dist/wasm/spatiasql.wasm' });
} else {
  tests(require('../dist/spatiasql')());
}

function tests(SQL) {
	var db = new SQL.Database();

	[
		['SELECT json_type(\'{"a":[2,3.5,true,false,null,"x"]}\')', 'object'],
		['SELECT json_type(\'{"a":[2,3.5,true,false,null,"x"]}\',\'$\')', 'object'],
		['SELECT json_type(\'{"a":[2,3.5,true,false,null,"x"]}\',\'$.a\')', 'array'],
		['SELECT json_type(\'{"a":[2,3.5,true,false,null,"x"]}\',\'$.a[0]\')', 'integer'],
		['SELECT json_type(\'{"a":[2,3.5,true,false,null,"x"]}\',\'$.a[1]\')', 'real'],
		['SELECT json_type(\'{"a":[2,3.5,true,false,null,"x"]}\',\'$.a[2]\')', 'true'],
		['SELECT json_type(\'{"a":[2,3.5,true,false,null,"x"]}\',\'$.a[3]\')', 'false'],
		['SELECT json_type(\'{"a":[2,3.5,true,false,null,"x"]}\',\'$.a[4]\')', 'null'],
		['SELECT json_type(\'{"a":[2,3.5,true,false,null,"x"]}\',\'$.a[5]\')', 'text'],
		['SELECT json_type(\'{"a":[2,3.5,true,false,null,"x"]}\',\'$.a[6]\')', null]
	].forEach(t => {
		var res = db.exec(t[0]);
		if (db.exec(t[0])[0].values[0][0] !== t[1])
			console.log(t, 'failed', db.exec(t[0])[0].values[0][0]);
		else
			console.log('ok', t[0], t[1]);
	})

}
