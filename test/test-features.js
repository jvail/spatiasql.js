const fs = require('fs');
const spatiasql = require('../dist/spatiasql-node');

spatiasql.then(Database => {

    const db = new Database();

    let res = db.exec(`
        SELECT
        HasIconv() hasIconv,
        HasMathSQL() hasMathSQL,
        HasGeoCallbacks() hasGeoCallbacks,
        HasProj() hasProj,
        HasGeos() hasGeos,
        HasGeosAdvanced() hasGeosAdvanced,
        HasGeosTrunk() hasGeosTrunk,
        HasGeosReentrant() hasGeosReentrant,
        HasGeosOnlyReentrant() hasGeosOnlyReentrant,
        HasRtTopo() hasRtTopo,
        HasLibXML2() hasLibXML2,
        HasEpsg() hasEpsg,
        HasFreeXL() hasFreeXL,
        HasGeoPackage() hasGeoPackage,
        HasGCP() hasGCP,
        HasGroundControlPoints() hasGroundControlPoints,
        HasTopology() hasTopology,
        HasKNN() hasKNN,
        HasRouting() hasRouting
    `);

    console.log(res[0].columns.reduce((obj, column, i) => {
        obj[column] = !!res[0].values[0][i];
        return obj;
    }, {}));


});
