# run make
# geos and proj *.a seem not to compile very well to JS. Anyway, the recommend way is to use *.so or *.o

EMCC_FLAGS :=
EMCC_FLAGS += -s INLINING_LIMIT=30
# access emcc settings through Runtime.compilerSettings or Runtime.getCompilerSetting(name)
EMCC_FLAGS += -s RETAIN_COMPILER_SETTINGS=1
# EMCC_FLAGS += -s LINKABLE=1
# noticeable faster without DISABLE_EXCEPTION_CATCHING=0
EMCC_FLAGS += -s DISABLE_EXCEPTION_CATCHING=0
# https://github.com/jsmess/jsmess/blob/master/makefile
# EMCC_FLAGS += -s TOTAL_MEMORY=16777216      # 16mb
# EMCC_FLAGS += -s TOTAL_MEMORY=33554432      # 32mb
# EMCC_FLAGS += -s TOTAL_MEMORY=67108864      # 64mb
# EMCC_FLAGS += -s TOTAL_MEMORY=134217728     # 128mb
EMCC_FLAGS += -s TOTAL_MEMORY=268435456# 256mb
# EMCC_FLAGS += -s ALLOW_MEMORY_GROWTH=1

PWD=$(shell pwd)
BCDIR=$(PWD)/bc
PREFIX=--prefix=$(BCDIR)

all: getsrc proj geos zlib sqlite spatialite js/spatiasql.js

getsrc:
	mkdir $(PWD)/src; \
	cd $(PWD)/src; \
	wget -nc http://www.gaia-gis.it/gaia-sins/libspatialite-sources/libspatialite-4.3.0a.tar.gz; \
	tar -xzvf libspatialite-4.3.0a.tar.gz; \
	rm -rf libspatialite; \
	mv -f libspatialite-4.3.0a libspatialite; \
	wget -nc http://download.osgeo.org/geos/geos-3.5.0.tar.bz2; \
	tar -xjvf geos-3.5.0.tar.bz2; \
	rm -rf geos; \
	mv -f geos-3.5.0 geos; \
	wget -nc https://github.com/OSGeo/proj.4/archive/4.9.1.tar.gz; \
	tar -xzvf 4.9.1.tar.gz; \
	rm -rf proj; \
	mv -f proj.4-4.9.1 proj; \
	wget -nc http://zlib.net/zlib-1.2.11.tar.gz; \
	tar -xzvf zlib-1.2.11.tar.gz; \
	rm -rf zlib; \
	mv -f zlib-1.2.11 zlib; \
	wget -nc https://www.sqlite.org/2015/sqlite-amalgamation-3081101.zip; \
	unzip sqlite-amalgamation-3081101.zip; \
	rm -rf sqlite; \
	mv -f sqlite-amalgamation-3081101 sqlite; \

proj:
	cd $(PWD)/src/proj; \
	emconfigure ./configure $(PREFIX) --without-mutex --host=none-none-none; \
	emmake make install; \
	rm -f $(PWD)/src/proj/src/cs2cs.o $(PWD)/src/proj/src/geod.o $(PWD)/src/proj/src/nad2bin.o ./src/proj.o; # remove files for executables \ 
	find $(PWD)/src/proj/src -type f | grep '\.o\b' | EMCC_DEBUG=1 xargs emcc -o $(BCDIR)/proj.bc # join all .o files

geos:
	cd $(PWD)/src/geos; \
	emconfigure ./configure $(PREFIX) --host=none-none-none; \
	emmake make install; \
	find $(PWD)/src/geos/src -type f | grep '\.o\b' | EMCC_DEBUG=1 xargs emcc -o $(BCDIR)/geos.bc # join all .o files \
	find $(PWD)/src/geos/capi -type f | grep '\.o\b' | EMCC_DEBUG=1 xargs emcc -o $(BCDIR)/geos_c.bc # join all .o files

# could not figure out if it is possible to get rid of zlib
zlib:
	cd $(PWD)/src/zlib; \
	emconfigure ./configure --static $(PREFIX); \
	EMDEBUG=1 emmake make install; \
	find $(PWD)/src/zlib -type f | grep '\.o\b' | EMCC_DEBUG=1 xargs emcc -o $(BCDIR)/zlib.bc # join all .o files

sqlite:
	EMDEBUG=1 emcc -DSQLITE_OMIT_LOAD_EXTENSION -DSQLITE_ENABLE_RTREE -DSQLITE_DISABLE_LFS -DLONGDOUBLE_TYPE=double -DSQLITE_INT64_TYPE="long long int" -DSQLITE_THREADSAFE=0 \
	$(PWD)/src/sqlite/sqlite3.c \
	-o $(BCDIR)/sqlite.bc

#--disable-iconv
#	CFLAGS="-ULOADABLE_EXTENSION"
spatialite:
	cd $(PWD)/src/libspatialite; \
	cp -n configure configure.backup; \
	cp -f configure.backup configure; \
	# patch spatialite configure \
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
	CPPFLAGS="-I$(BCDIR)/include/ -I$(PWD)/src/sqlite/" \
	LDFLAGS="-L$(BCDIR)/lib/" \
	--with-geosconfig="$(BCDIR)/bin/geos-config" \
	--enable-geosadvanced=yes \
	--enable-epsg=no \
	--enable-mathsql=no \
	--enable-geocallbacks=no \
	--enable-freexl=no \
	--enable-lwgeom=no \
	--enable-libxml2=no \
	--enable-gcov=no \
	--enable-examples=no ; \
	EMDEBUG=1 emmake make install;

js/spatiasql.js: js/shell-pre.js js/spatiasql-raw.js js/shell-post.js
	cat $^ > $@; \
	rm -f $(PWD)/js/spatiasql-raw.js

js/spatiasql-raw.js: js/api.js exported_functions 
	EMDEBUG=1 emcc --memory-init-file 0 -O3 $(EMCC_FLAGS) -s EXPORTED_FUNCTIONS=@exported_functions  \
	$(BCDIR)/sqlite.bc $(BCDIR)/zlib.bc $(BCDIR)/geos_c.bc $(BCDIR)/geos.bc $(BCDIR)/proj.bc $(BCDIR)/lib/libspatialite.a --post-js js/api.js -o $@

js/api.js: coffee/api.coffee coffee/exports.coffee coffee/api-data.coffee
	coffee --bare --compile --join $@ --compile $^

# Web worker API
worker: js/spatiasql.worker.js
js/worker.js: coffee/worker.coffee
	coffee --bare --compile --join $@ --compile $^

js/spatiasql.worker.js: js/spatiasql.js js/worker.js
	cat $^ > $@

clean:
	cd $(PWD)/src/proj; emmake make clean; \
	cd $(PWD)/src/geos; emmake make clean; \
	cd $(PWD)/src/zlib; emmake make clean; \
	cd $(PWD)/src/sqlite; emmake make clean; \
	cd $(PWD)/src/libspatialite; emmake make clean; \
	rm -f $(PWD)/js/spatiasql.js $(PWD)/js/api.js $(PWD)/js/worker.js $(PWD)/js/spatiasql.worker.js;
