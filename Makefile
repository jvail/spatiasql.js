# run make
# geos and proj *.a seem not to compile very well to JS. Anyway, the recommend way is to use *.so or *.o

EMCC_FLAGS :=
EMCC_FLAGS += -s INLINING_LIMIT=50
# https://github.com/jsmess/jsmess/blob/master/makefile
# EMCC_FLAGS += -s TOTAL_MEMORY=16777216      # 16mb
# EMCC_FLAGS += -s TOTAL_MEMORY=33554432      # 32mb
# EMCC_FLAGS += -s TOTAL_MEMORY=67108864      # 64mb
# EMCC_FLAGS += -s TOTAL_MEMORY=134217728     # 128mb
EMCC_FLAGS += -s TOTAL_MEMORY=268435456     # 256mb
#EMCC_FLAGS += -s ALLOW_MEMORY_GROWTH=1

PWD=$(shell pwd)
BCDIR=$(PWD)/src/install_bc/lib
PREFIX=--prefix=$(PWD)/src/install_bc

all: proj geos zlib sqlite spatialite js/spatiasql.js

proj:
	cd $(PWD)/src/proj; \
	emconfigure ./configure $(PREFIX) --without-mutex --host=none-none-none; \
	emmake make install; \
	rm -f $(PWD)/src/proj/src/cs2cs.o $(PWD)/src/proj/src/geod.o $(PWD)/src/proj/src/nad2bin.o ./src/proj.o; # remove files for executables \ 
	find $(PWD)/src/proj/src -type f | grep '\.o\b' | EMCC_DEBUG=1 xargs emcc -O3 -o $(PWD)/src/install_bc/lib/proj.bc # join all .o files

geos:
	cd $(PWD)/src/geos; \
	emconfigure ./configure $(PREFIX) --host=none-none-none; \
	emmake make install; \
	find $(PWD)/src/geos/src -type f | grep '\.o\b' | EMCC_DEBUG=1 xargs emcc -O3 -o $(PWD)/src/install_bc/lib/geos.bc # join all .o files \
	find $(PWD)/src/geos/capi -type f | grep '\.o\b' | EMCC_DEBUG=1 xargs emcc -O3 -o $(PWD)/src/install_bc/lib/geos_c.bc # join all .o files

# could not figure out if it is possible to get rid of zlib
zlib:
	cd $(PWD)/src/zlib; \
	emconfigure ./configure --static $(PREFIX); \
	EMDEBUG=1 emmake make install; \
	find $(PWD)/src/zlib -type f | grep '\.o\b' | EMCC_DEBUG=1 xargs emcc -O3 -o $(PWD)/src/install_bc/lib/zlib.bc # join all .o files

sqlite:
	EMDEBUG=1 emcc -O3 -DSQLITE_OMIT_LOAD_EXTENSION -DSQLITE_ENABLE_RTREE -DSQLITE_DISABLE_LFS -DLONGDOUBLE_TYPE=double -DSQLITE_INT64_TYPE="long long int" -DSQLITE_THREADSAFE=0 \
	$(PWD)/src/sqlite-amalgamation/sqlite3.c \
	-o $(PWD)/src/install_bc/lib/sqlite.bc

spatialite:
	cd $(PWD)/src/libspatialite; \
	cp -n configure configure.backup; \
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
	EMCONFIGURE_JS=1 emconfigure ./configure $(PREFIX) --host=none-none-none \
	CFLAGS="-ULOADABLE_EXTENSION" \
	CPPFLAGS="-I$(PWD)/src/install_bc/include/ -I$(PWD)/src/sqlite-amalgamation/" \
	LDFLAGS="-L$(PWD)/src/install_bc/lib/" \
	--disable-mathsql \
	--disable-geocallbacks \
	--disable-freexl \
	--disable-epsg \
	--disable-geosadvanced \
	--disable-lwgeom \
	--disable-libxml2 \
	--disable-gcov \
	--disable-examples \
	--disable-iconv ; \
	EMDEBUG=1 emmake make install EMCC_CFLAGS="-O3"

js/spatiasql.js: js/shell-pre.js js/spatiasql-raw.js js/shell-post.js
	cat $^ > $@; \
	rm -f $(PWD)/js/spatiasql-raw.js

js/spatiasql-raw.js: js/api.js exported_functions 
	EMDEBUG=1 emcc --memory-init-file 0 -O3 $(EMCC_FLAGS) -s EXPORTED_FUNCTIONS=@exported_functions  \
	$(BCDIR)/sqlite.bc $(BCDIR)/zlib.bc $(BCDIR)/geos_c.bc $(BCDIR)/geos.bc $(BCDIR)/proj.bc $(BCDIR)/libspatialite.a --post-js js/api.js -o $@

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
	cd $(PWD)/src/libspatialite; emmake make clean; \
	rm -f $(PWD)/js/spatiasql.js $(PWD)/js/api.js $(PWD)/js/worker.js $(PWD)/js/spatiasql.worker.js;



