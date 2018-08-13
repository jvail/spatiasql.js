const fs = require('fs');
const spatiasql = require('../dist/spatiasql-node');

spatiasql.then(Database => {

  const db = new Database();

  let ok = db.loadshp('ne_110m_admin_0_countries', 'CP1251', 4326, {
    shp: fs.readFileSync('./shp/ne_110m_admin_0_countries.shp'),
    dbf: fs.readFileSync('./shp/ne_110m_admin_0_countries.dbf'),
    shx: fs.readFileSync('./shp/ne_110m_admin_0_countries.shx')
  });

  if (ok) {
    let res = db.exec('SELECT * FROM ne_110m_admin_0_countries');
    console.log(res);
  }


});
