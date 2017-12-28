window.onload = function () {
	var id = 0;
	var collection = { type: 'FeatureCollection', features: [] };
	var runWasm = location.search.substr(1) === 'wasm';
	var editor = CodeMirror.fromTextArea(document.getElementById('code'), {
		mode: 'text/x-sql',
		keyMap: 'sublime',
		theme: 'monokai',
		viewportMargin: Infinity,
		lineWrapping: true,
		scrollbarStyle: 'native'
	});
	function renderdata(data) {

		var tbl = document.getElementById('tbl');
		if (data) {
			var html = '<table><tr>';
			html += data.columns.reduce(function (html, d) {
				html += '<th>' + d + '</th>';
				return html;
			}, '') + '</tr>';
			html += data.values.reduce(function (html, row) {
				html += '<tr>';
				row.forEach(function (col) {
					html += '<td>' + (typeof col === 'string' || typeof col === 'number' ? col : typeof col) + '</td>';
				});
				html += '</tr>';
				return html;
			}, '');
			html += '</table>';

			tbl.innerHTML = html;
			draw(data);
		} else {
			tbl.innerHTML = '';
		}

	}
	var timer = {
		span: document.getElementById('time'),
		interval: null,
		start: function () {
			timer.time = Date.now();
			timer.interval = setInterval(function() { timer.run() }, 10);
		},
		stop: function () {
			clearInterval(timer.interval);
		},
		run: function () {
			timer.span.innerHTML = ((Date.now() - timer.time) / 1000).toFixed(2) + ' sec';
		},
		time: Date.now()
	};
	timer.start();
	mapboxgl.accessToken = 'pk.eyJ1IjoicXVhc2lnaXQiLCJhIjoiY2pib3h1aWF4NXJrMTJxbnVhbG9qeTdqeSJ9.5pJbvgw8_UJ8bZAQ_V9dOg';
	var map = new mapboxgl.Map({
		container: 'map',
		style: 'mapbox://styles/mapbox/dark-v9',
		zoom: 2
	}).on('load', function() {
		map.addSource('source', { type: 'geojson', data: collection });
		map.addLayer({
			id: 'poly',
			type: 'fill',
			source: 'source',
			paint: {
				'fill-color': '#ae81ff',
				'fill-opacity': 0.4
			},
			filter: ['==', '$type', 'Polygon']
		});
		map.addLayer({
			id: 'line',
			type: 'line',
			source: 'source',
			layout: {
				'line-join': 'round',
				'line-cap': 'round'
			},
			paint: {
				'line-color': '#e6db74',
				'line-width': 1
			},
			filter: ['==', '$type', 'LineString']
		});
		map.addLayer({
			id: 'point',
			type: 'circle',
			source: 'source',
			paint: {
				'circle-radius': 4,
				'circle-color': '#f92672'
			},
			filter: ['==', '$type', 'Point'],
		});
	});
	map.addControl(new mapboxgl.NavigationControl());
	var worker = new Worker(
		runWasm ? 'dist/wasm/spatiasql.worker.js' : 'dist/spatiasql.worker.js'
	);
	worker.onerror = function (evt) {
		document.getElementById('error').innerHTML = evt.message;
		timer.stop();
	};
	worker.onmessage = function (evt) {
		if (evt.data.initialized) {
			var xhr = new XMLHttpRequest();
			xhr.open('GET', 'data/test-2.3.sqlite', true);
			xhr.responseType = 'arraybuffer';
			xhr.onload = function(e) {
				var uInt8Array = new Uint8Array(this.response);
				worker.postMessage({
					id: 0,
					action: 'open',
					buffer: uInt8Array
				});
			};
			xhr.send();
		}
		if (evt.data.id === 0) {
			worker.postMessage({
				id: id++,
				action: 'exec',
				sql: 'SELECT sqlite_version(), spatialite_version(), proj4_version(), geos_version()'
			});
		} else {
			timer.stop();
			if (Array.isArray(evt.data.results)) {
				renderdata(evt.data.results[0]);
			}
		}
	};

	document.getElementById('run').addEventListener('click', function (evt) {
		var sql = editor.getValue();
		document.getElementById('error').innerHTML = '';
		if (sql.length > 0) {
			timer.start();
			worker.postMessage({
				id: id++,
				action: 'exec',
				sql: sql
			});
		}
	});

	function draw (res) {
		var features = [], cols = res.columns, rows = res.values;
		for (var c = 0, cs = cols.length; c < cs; c++) {
			if (cols[c].toLowerCase().indexOf('geojson') >= 0) {
				for (var r = 0, rs = rows.length; r < rs; r++) {
					try {
						var geojson = JSON.parse(rows[r][c]);
						var feature = {
							type: 'Feature',
							properties: {},
							geometry: geojson
						};
						rows[r].forEach(function (data, index) {
							if (index !== c) {
								if (typeof data === 'number')
								feature.properties[cols[index]] = data.toFixed(2);
								else if (typeof data === 'string')
								feature.properties[cols[index]] = (data.length > 20 ? data.substr(0, 20) + '..' : data);
							}
						});
						rows[r][c] = geojson;
						if (feature.geometry)
							features.push(feature);
					} catch (e) {
						console.log(e);
					}
				}
			}
		}
		if (features.length > 0) {
			collection.features = features;
			map.getSource('source').setData(collection);
			map.fitBounds(turf.bbox(collection), { padding: 20 });
		}
	}

	document.getElementById('file').addEventListener('change', function () {
		var file = this.files.item(0);
		if (file) {
			var reader = new FileReader();
			reader.onload = function () {
				worker.postMessage({
					id: id++,
					action: 'open',
					buffer: new Uint8Array(reader.result)
				});
				worker.postMessage({
					id: id++,
					action: 'exec',
					sql: 'SELECT * FROM sqlite_master WHERE type="table" OR type="view"'
				});
			}
			reader.readAsArrayBuffer(file);
		}
	});
}
