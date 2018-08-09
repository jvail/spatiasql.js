initialize.then(function (Database) {
	var db = null;
	var stmts = [];
	var counter = 0;
	var createDb = function (data) {
		if (db != null) {
			db.close();
		}
		return db = new Database(data);
	};
	var getStatement = function(stmtID) {
		return stmts.find(function (stmt) { return stmtID === stmt.id }).stmt;
	}
	self.onmessage = function (event) {
		var buff, data, result;
		data = event['data'];
		switch (data != null ? data['action'] : void 0) {
			case 'open':
				createDb((data.buffer ? new Uint8Array(data.buffer) : undefined));
				return postMessage(true);
			case 'close':
				if (db != null) {
					db.close();
				}
				return postMessage(true);
			case 'exec':
				if (db === null) {
					createDb();
				}
				try {
					if (data.params) {
						var stmt = db.prepare(data.sql);
						stmt.bind(data.params);
						var values = [];
						while (stmt.step()) {
							values.push(stmt.get());
						}
						postMessage(values);
					} else {
						postMessage(db.exec(data.sql));
					}
				} catch (err) {
					postMessage({
						error: err.message
					});
				}
				break;
			case 'prepare':
				try {
					var stmt = db.prepare(data.sql);
					var id = counter++;
					stmts.push({ id: id, stmt: stmt });
					postMessage({ stmtID: id });
				} catch (err) {
					postMessage({
						error: err.message
					});
				}
				break;
			case 'bind':
				try {
					var stmt = getStatement(data.stmtID);
					postMessage(stmt.bind(data.params));
				} catch (err) {
					postMessage({
						error: err.message
					});
				}
				break;
			case 'step':
				try {
					var stmt = getStatement(data.stmtID);
					postMessage(stmt.step(data.params));
				} catch (err) {
					postMessage({
						error: err.message
					});
				}
				break;
			case 'get':
				try {
					var stmt = getStatement(data.stmtID);
					postMessage(stmt.get());
				} catch (err) {
					postMessage({
						error: err.message
					});
				}
				break;
			case 'getAsObject':
				try {
					var stmt = getStatement(data.stmtID);
					postMessage(stmt.getAsObject());
				} catch (err) {
					postMessage({
						error: err.message
					});
				}
				break;
			case 'free':
				try {
					var stmt = getStatement(data.stmtID);
					postMessage(stmt.free());
				} catch (err) {
					postMessage({
						error: err.message
					});
				} finally {
					stmts.splice(stmts.findIndex(function (stmt) { return stmt.id = data.stmtID; }), 1);
				}
				break;
			case 'export':
				try {
					var buffer = db.export().buffer;
					return postMessage(buffer, [buffer]);
				} catch (err) {
					return postMessage({
						'error': err.message
					})
				}
				break;
			case 'loadshp':
				try {
					data.shpfiles.shp = new Uint8Array(data.shpfiles.shp);
					data.shpfiles.dbf = new Uint8Array(data.shpfiles.dbf);
					data.shpfiles.shx = new Uint8Array(data.shpfiles.shx);
					return postMessage(db.loadshp(data.tablename, data.codeset, data.srid, data.shpfiles));
				} catch (err) {
					return postMessage({
						'error': err.message
					});
				}
				break;
			default:
				postMessage({
					'error': 'Invalid action : ' + (data != null ? data.action : undefined)
				});
		}
	};
	postMessage({ initialized: true });
});

