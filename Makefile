SPATIALITE_VERSION = '4.3.0a'
SQLITE_VERSION = '3210000'
GEOS_VERSION = '3.6.2'
PROJ4_VERSION = '4.9.3'
ZLIB_VERSION = '1.2.11'

EMCC_FLAGS :=
EMCC_FLAGS += -s INLINING_LIMIT=20
EMCC_FLAGS += -s RETAIN_COMPILER_SETTINGS=1
EMCC_FLAGS += -s DISABLE_EXCEPTION_CATCHING=0
EMCC_FLAGS += -s EXPORTED_FUNCTIONS="[ \
	'_spatialite_version', \
	'_spatialite_alloc_connection', \
	'_spatialite_init_ex', \
	'_spatialite_cleanup_ex', \
	'_load_shapefile_ex', \
	'_malloc', \
	'_free', \
	'_sqlite3_open', \
	'_sqlite3_exec', \
	'_sqlite3_free', \
	'_sqlite3_errmsg', \
	'_sqlite3_prepare_v2', \
	'_sqlite3_bind_text', \
	'_sqlite3_bind_blob', \
	'_sqlite3_bind_double', \
	'_sqlite3_bind_int', \
	'_sqlite3_bind_parameter_index', \
	'_sqlite3_step', \
	'_sqlite3_data_count', \
	'_sqlite3_column_double', \
	'_sqlite3_column_text', \
	'_sqlite3_column_blob', \
	'_sqlite3_column_bytes', \
	'_sqlite3_column_type', \
	'_sqlite3_column_name', \
	'_sqlite3_reset', \
	'_sqlite3_clear_bindings', \
	'_sqlite3_finalize', \
	'_sqlite3_close_v2' \
]"
PWD = $(shell pwd)
TEMP = $(PWD)/src/temp
BCDIR = $(TEMP)/bc
PREFIX = --prefix=$(BCDIR)

all: getsrc proj4 geos zlib sqlite spatialite asm wasm

getsrc:
	cd $(PWD)/src; \
	mkdir -p temp; \
	cd temp; \
	wget -nc http://www.gaia-gis.it/gaia-sins/libspatialite-sources/libspatialite-$(SPATIALITE_VERSION).tar.gz; \
	tar -xf libspatialite-$(SPATIALITE_VERSION).tar.gz; \
	wget -nc http://download.osgeo.org/geos/geos-$(GEOS_VERSION).tar.bz2; \
	tar -xf geos-$(GEOS_VERSION).tar.bz2; \
	wget -nc http://download.osgeo.org/proj/proj-$(PROJ4_VERSION).tar.gz; \
	tar -xf proj-$(PROJ4_VERSION).tar.gz; \
	wget -nc http://zlib.net/zlib-$(ZLIB_VERSION).tar.gz; \
	tar -xf zlib-1.2.11.tar.gz; \
	wget -nc https://www.sqlite.org/2017/sqlite-amalgamation-$(SQLITE_VERSION).zip; \
	unzip -o sqlite-amalgamation-$(SQLITE_VERSION).zip;

proj4:
	cd $(TEMP)/proj-$(PROJ4_VERSION); \
	emconfigure ./configure $(PREFIX) --without-mutex --host=none-none-none; \
	emmake make -j4 install; \
	rm -f $(TEMP)/proj-$(PROJ4_VERSION)/src/cs2cs.o $(TEMP)/proj-$(PROJ4_VERSION)/src/geod.o \
	$(TEMP)/proj-$(PROJ4_VERSION)/src/nad2bin.o $(TEMP)/proj-$(PROJ4_VERSION)/src/temp/proj.o; \
	find $(TEMP)/proj-$(PROJ4_VERSION)/src -type f | grep '\.o\b' | EMCC_DEBUG=1 xargs emcc -o $(BCDIR)/proj.bc;

geos:
	cd $(TEMP)/geos-$(GEOS_VERSION); \
	emconfigure ./configure $(PREFIX) --host=none-none-none; \
	emmake make -j4 install; \
	find $(TEMP)/geos-$(GEOS_VERSION)/src -type f | grep '\.o\b' | EMCC_DEBUG=1 xargs emcc -o $(BCDIR)/geos.bc; \
	find $(TEMP)/geos-$(GEOS_VERSION)/capi -type f | grep '\.o\b' | EMCC_DEBUG=1 xargs emcc -o $(BCDIR)/geos_c.bc;

zlib:
	cd $(TEMP)/zlib-$(ZLIB_VERSION); \
	emconfigure ./configure --static $(PREFIX); \
	EMDEBUG=1 emmake make -j4 install; \
	find $(TEMP)/zlib-$(ZLIB_VERSION) -type f | grep '\.o\b' | EMCC_DEBUG=1 xargs emcc -o $(BCDIR)/zlib.bc;

sqlite: # https://github.com/kripken/sql.js/issues/210
	cd $(TEMP)/sqlite-amalgamation-$(SQLITE_VERSION); \
	cp -f sqlite3.h $(BCDIR)/include/sqlite3.h; \
	cp -f sqlite3ext.h $(BCDIR)/include/sqlite3ext.h; \
	sed -i -e 's/#if SQLITE_INT64_TYPE/#ifdef SQLITE_INT64_TYPE/' sqlite3.c; \
	EMDEBUG=1 emcc -DSQLITE_OMIT_LOAD_EXTENSION -DSQLITE_ENABLE_JSON1 -DSQLITE_ENABLE_RTREE -DSQLITE_DISABLE_LFS -DLONGDOUBLE_TYPE=double -DSQLITE_INT64_TYPE="long long int" -DSQLITE_THREADSAFE=0 \
	sqlite3.c -o $(BCDIR)/sqlite.bc;

spatialite:
	cd $(TEMP)/libspatialite-$(SPATIALITE_VERSION); \
	cp -n configure configure.backup; \
	cp -f configure.backup configure; \
	sed -i \
	 -e 's/^return pj_init_plus ();/\/\/return pj_init_plus ();/' \
	 -e 's/^return inflateInit_ ();/\/\/return inflateInit_ ();/' \
	 -e 's/^return sqlite3_rtree_geometry_callback ();/\/\/return sqlite3_rtree_geometry_callback ();/' \
	 -e 's/^return sqlite3_prepare_v2 ();/\/\/return sqlite3_prepare_v2 ();/' \
	 -e 's/^return pj_init_plus ();/\/\/return pj_init_plus ();/' \
	 -e 's/^return pj_init_ctx ();/\/\/return pj_init_ctx ();/' \
	 -e 's/^return iconv ();/\/\/return iconv ();/' \
	 -e 's/^return libiconv ();/\/\/return libiconv ();/' \
	 -e 's/^return locale_charset ();/\/\/return locale_charset ();/' \
	 -e 's/^return nl_langinfo ();/\/\/return nl_langinfo ();/' \
	 -e 's/^return freexl_open ();/\/\/return freexl_open ();/' \
	 -e 's/^return GEOSCoveredBy ();/\/\/return GEOSCoveredBy ();/' \
	 -e 's/^return GEOSDelaunayTriangulation ();/\/\/return GEOSDelaunayTriangulation ();/' \
	 -e 's/^return lwgeom_set_handlers ();/\/\/return lwgeom_set_handlers ();/' configure ; \
	EMCONFIGURE_JS=1 emconfigure ./configure $(PREFIX) --host=none \
	CFLAGS="-ULOADABLE_EXTENSION" \
	CPPFLAGS="-I$(BCDIR)/include/" \
	LDFLAGS="-L$(BCDIR)/lib/" \
	--with-geosconfig="$(BCDIR)/bin/geos-config" \
	--enable-geosadvanced=yes \
	--enable-epsg=no \
	--enable-mathsql=no \
	--enable-geocallbacks=no \
	--enable-freexl=no \
	--enable-lwgeom=no  \
	--enable-libxml2=no \
	--enable-gcov=no \
	--enable-examples=no ; \
	EMDEBUG=1 emmake make -j4 install;

.PHONY: asm
asm: src/pre.js src/post.js
	EMDEBUG=1 emcc --memory-init-file 0 -O3 $(EMCC_FLAGS) \
	-s EXTRA_EXPORTED_RUNTIME_METHODS="['cwrap']" -s TOTAL_MEMORY=268435456 \
	$(BCDIR)/sqlite.bc $(BCDIR)/zlib.bc $(BCDIR)/proj.bc $(BCDIR)/geos_c.bc $(BCDIR)/geos.bc $(BCDIR)/lib/libspatialite.a --post-js src/api.js -o dist/spatiasql.js; \
	cat src/pre.js dist/spatiasql.js src/post.js > dist/spatiasql.js.tmp; \
	mv dist/spatiasql.js.tmp dist/spatiasql.js; \
	cat dist/spatiasql.js src/worker.js > dist/spatiasql.worker.js;

.PHONY: wasm
wasm: src/pre.js src/post.js
	EMDEBUG=1 emcc --memory-init-file 0 -O3 $(EMCC_FLAGS) -s WASM=1 \
	-s EXTRA_EXPORTED_RUNTIME_METHODS="['cwrap']" -s ALLOW_MEMORY_GROWTH=1 \
	$(BCDIR)/sqlite.bc $(BCDIR)/zlib.bc $(BCDIR)/proj.bc $(BCDIR)/geos_c.bc $(BCDIR)/geos.bc $(BCDIR)/lib/libspatialite.a --post-js src/api.js -o dist/wasm/spatiasql.js; \
	cat src/pre.js dist/wasm/spatiasql.js src/post.js > dist/wasm/spatiasql.js.tmp; \
	mv dist/wasm/spatiasql.js.tmp dist/wasm/spatiasql.js; \
	cat dist/wasm/spatiasql.js src/worker.wasm.js > dist/wasm/spatiasql.worker.js;

clean:
	cd $(TEMP)/proj-$(PROJ4_VERSION); make clean; \
	cd $(TEMP)/geos-$(GEOS_VERSION); make clean; \
	cd $(TEMP)/zlib-$(ZLIB_VERSION); make clean; \
	cd $(TEMP)/sqlite-amalgamation-$(SQLITE_VERSION); make clean; \
	cd $(TEMP)/libspatialite-$(SPATIALITE_VERSION); make clean; \
	rm -rf $(BCDIR)/*; \
	rm -rf $(PWD)/dist/wasm/*; \
	rm -rf $(PWD)/dist/*.js;
