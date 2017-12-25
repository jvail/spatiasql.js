var spatiasql = function (cb /*wasm*/, opt) {

var Module = {
	'locateFile': function (url) {
		switch (url.substr(url.indexOf('.') + 1)) {
			case 'wasm':
			return (opt && opt.pathWasm) ? opt.pathWasm : url;
			default:
			return url;
		}
	}
};

if (cb) {
	Module['onRuntimeInitialized'] = function () {
			initspatiasql(cb);
		};
}
