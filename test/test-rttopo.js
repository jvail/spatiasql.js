// https://www.gaia-gis.it/fossil/libspatialite/wiki?name=toponet-start

const fs = require('fs');
const spatiasql = require('../dist/spatiasql-node');
const netname = 'testnetz';

spatiasql.then(Database => {

    const db = new Database();
    let res;

    try {
        db.exec(`SELECT CreateNetwork(\'${netname}\', true, 4326, false, false);`);

        db.exec(`
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-180, 90, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-180, 60, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-180, 0, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-180, -30, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-180, -60, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-180, -90, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-90, 90, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-90, 30, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-90, 0, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-90, -30, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-90, -60, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-90, -90, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(30, 0, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(0, 0, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(-30, 0, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(30, 90, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(30, 30, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(180, 90, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(180, 30, 4326));
            SELECT ST_AddIsoNetNode(\'${netname}\', MakePoint(180, 0, 4326));
            SELECT ST_AddLink(\'${netname}\', 1, 2,
                ST_GeomFromText('LINESTRING(-180 90, -180 60)', 4326));
            SELECT ST_AddLink(\'${netname}\', 3, 4,
                ST_GeomFromText('LINESTRING(-180 0, -180 -30)', 4326));
            SELECT ST_AddLink(\'${netname}\', 4, 5,
                ST_GeomFromText('LINESTRING(-180 -30, -180 -60)', 4326));
            SELECT ST_AddLink(\'${netname}\', 5, 6,
                ST_GeomFromText('LINESTRING(-180 -60, -180 -90)', 4326));
            SELECT ST_AddLink(\'${netname}\', 1, 7,
                ST_GeomFromText('LINESTRING(-180 90, -90 90)', 4326));
            SELECT ST_AddLink(\'${netname}\', 2, 8,
                ST_GeomFromText('LINESTRING(-180 60, -90 30)', 4326));
            SELECT ST_AddLink(\'${netname}\', 3, 9,
                ST_GeomFromText('LINESTRING(-180 0, -90 0)', 4326));
            SELECT ST_AddLink(\'${netname}\', 6, 12,
                ST_GeomFromText('LINESTRING(-180 -90, -90 -90)', 4326));
            SELECT ST_AddLink(\'${netname}\', 7, 8,
                ST_GeomFromText('LINESTRING(-90 90, -90 30)', 4326));
            SELECT ST_AddLink(\'${netname}\', 8, 9,
                ST_GeomFromText('LINESTRING(-90 30, -90 0)', 4326));
            SELECT ST_AddLink(\'${netname}\', 9, 10,
                ST_GeomFromText('LINESTRING(-90 0, -90 -30)', 4326));
            SELECT ST_AddLink(\'${netname}\', 10, 11,
                ST_GeomFromText('LINESTRING(-90 -30, -90 -60)', 4326));
            SELECT ST_AddLink(\'${netname}\', 11, 12,
                ST_GeomFromText('LINESTRING(-90 -60, -90 -90)', 4326));
            SELECT ST_AddLink(\'${netname}\', 4, 11,
                ST_GeomFromText('LINESTRING(-180 -30, -90 -60)', 4326));
            SELECT ST_AddLink(\'${netname}\', 5, 12,
                ST_GeomFromText('LINESTRING(-180 -60, -90 -90)', 4326));
            SELECT ST_AddLink(\'${netname}\', 9, 15,
                ST_GeomFromText('LINESTRING(-90 0, -30 0)', 4326));
            SELECT ST_AddLink(\'${netname}\', 15, 14,
                ST_GeomFromText('LINESTRING(-30 0, 0 0)', 4326));
            SELECT ST_AddLink(\'${netname}\', 14, 13,
                ST_GeomFromText('LINESTRING(0 0, 30 0)', 4326));
            SELECT ST_AddLink(\'${netname}\', 13, 20,
                ST_GeomFromText('LINESTRING(30 0, 180 0)', 4326));
            SELECT ST_AddLink(\'${netname}\', 17, 19,
                ST_GeomFromText('LINESTRING(30 30, 180 30)', 4326));
            SELECT ST_AddLink(\'${netname}\', 14, 17,
                ST_GeomFromText('LINESTRING(0 0, 30 30)', 4326));
            SELECT ST_AddLink(\'${netname}\', 10, 15,
                ST_GeomFromText('LINESTRING(-90 -30, -30 0)', 4326));
            SELECT ST_AddLink(\'${netname}\', 12, 14,
                ST_GeomFromText('LINESTRING(-90 -90, 0 0)', 4326));
            SELECT ST_AddLink(\'${netname}\', 16, 17,
                ST_GeomFromText('LINESTRING(30 90, 30 30)', 4326));
            SELECT ST_AddLink(\'${netname}\', 16, 18,
                ST_GeomFromText('LINESTRING(30 90, 180 90)', 4326));
            SELECT ST_AddLink(\'${netname}\', 19, 18,
                ST_GeomFromText('LINESTRING(180 30, 180 90)', 4326));
            SELECT ST_AddLink(\'${netname}\', 19, 20,
                ST_GeomFromText('LINESTRING(180 30, 180 0)', 4326));
        `);

        res = db.exec(`SELECT ST_ValidSpatialNet(\'${netname}\')`);
        console.log('ST_ValidSpatialNet ' + (res[0].values[0][0] === null));
    } catch (err) {
        console.log(err);
    }

});
