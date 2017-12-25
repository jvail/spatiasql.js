var ww_createDb, ww_db;

if (typeof importScripts === 'function') {
  ww_db = null, spatiasql = spatiasql();
  ww_createDb = function(data) {
    if (ww_db != null) {
      ww_db.close();
    }
    return ww_db = new spatiasql.Database(data);
  };
  self.onmessage = function(event) {
    var buff, callback, data, done, err;
    data = event['data'];
    switch (data != null ? data['action'] : void 0) {
      case 'open':
        buff = data['buffer'];
        ww_createDb((buff ? new Uint8Array(buff) : void 0));
        return postMessage({
          'id': data['id'],
          'ready': true
        });
      case 'exec':
        if (ww_db === null) {
          ww_createDb();
        }
        if (!data['sql']) {
          throw new Error('exec: Missing query string');
        }
        return postMessage({
          'id': data['id'],
          'results': ww_db.exec(data['sql'])
        });
      case 'each':
        if (ww_db === null) {
          ww_createDb();
        }
        callback = function(row) {
          return postMessage({
            'id': data['id'],
            'row': row,
            'finished': false
          });
        };
        done = function() {
          return postMessage({
            'id': data['id'],
            'finished': true
          });
        };
        return ww_db.each(data['sql'], data['params'], callback, done);
      case 'export':
        buff = ww_db["export"]().buffer;
        try {
          return postMessage({
            'id': data['id'],
            'buffer': buff
          }, [buff]);
        } catch (_error) {
          err = _error;
          return postMessage({
            'id': data['id'],
            'buffer': buff
          });
        }
        break;
      case 'close':
        return ww_db != null ? ww_db.close() : void 0;
      default:
        throw new Error('Invalid action : ' + (data != null ? data['action'] : void 0));
    }
  };
  postMessage({ initialized: true });
}
