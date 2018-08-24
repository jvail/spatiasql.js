"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var GeometryFormat;
(function (GeometryFormat) {
    GeometryFormat[GeometryFormat["SpatiaLite"] = 0] = "SpatiaLite";
    GeometryFormat[GeometryFormat["GeoPackage"] = 1] = "GeoPackage";
    GeometryFormat[GeometryFormat["None"] = 2] = "None";
})(GeometryFormat = exports.GeometryFormat || (exports.GeometryFormat = {}));
// TODO: remove DataView
function geometryFormat(data) {
    const view = new DataView(data.buffer);
    if (view.getUint8(0) === 0 &&
        (view.getUint8(1) === 0 || view.getUint8(1) === 1) &&
        view.getUint8(38) === 124) {
        return GeometryFormat.SpatiaLite;
    }
    if (view.getUint16(0).toString(16) === '4750' &&
        (view.getUint8(2) === 1 || view.getUint8(2) === 0)) {
        return GeometryFormat.GeoPackage;
    }
    return GeometryFormat.None;
}
exports.geometryFormat = geometryFormat;
// TODO: remove DataView
function srid(data) {
    const view = new DataView(data.buffer);
    if (view.getUint8(0) === 0 &&
        (view.getUint8(1) === 0 || view.getUint8(1) === 1) &&
        view.getUint8(38) === 124) {
        return view.getUint32(2, !!view.getUint8(1));
    }
    return -1;
}
exports.srid = srid;
// async generartors do not work with Uglifyjs
// class Statement implements IStatement {
//     constructor(private stmtID: number, private worker: Worker, private jobs: IJob[]) {}
//     bind(params: any[]) {
//         return new Promise((resolve, reject) => {
//             this.addJob({ resolve, reject });
//             this.worker.postMessage({
//                 action: 'bind',
//                 params: params,
//                 stmtID: this.stmtID
//             })
//         });
//     }
//     async *step(): AsyncIterableIterator<boolean> {
//         while (true) {
//             let row = await new Promise((resolve, reject) => {
//                 this.addJob({ resolve, reject });
//                 this.worker.postMessage({
//                     action: 'step',
//                     stmtID: this.stmtID
//                 });
//             });
//             if (row) {
//                 yield true;
//             } else {
//                 return false
//             }
//         }
//     }
//     get() {
//         return new Promise((resolve, reject) => {
//             this.addJob({ resolve, reject });
//             this.worker.postMessage({
//                 action: 'get',
//                 stmtID: this.stmtID
//             })
//         });
//     }
//     getAsObject() {
//         return new Promise((resolve, reject) => {
//             this.addJob({ resolve, reject });
//             this.worker.postMessage({
//                 action: 'getAsObject',
//                 stmtID: this.stmtID
//             })
//         });
//     }
//     free() {
//         return new Promise((resolve, reject) => {
//             this.addJob({ resolve, reject });
//             this.worker.postMessage({
//                 action: 'free',
//                 stmtID: this.stmtID
//             })
//         });
//     }
// }
class Database {
    constructor(buffer) {
        this.worker = null;
        this.jobs = [];
        this.initialized = false;
        this.opened = false;
        this.ons = {
            jobQueueChange: (no) => { }
        };
        this.open(buffer).catch((err) => {
            throw err;
        });
    }
    busy() {
        return !!this.jobs.length;
    }
    on(name, fn) {
        if (this.ons[name]) {
            this.ons[name] = fn;
        }
    }
    off(name) {
        if (this.ons[name]) {
            this.ons[name] = () => { };
        }
    }
    exec(sql, params, userData) {
        return this.post({ action: 'exec', sql, params }, userData);
    }
    // async generartors do not work with Uglifyjs
    // async prepare(sql: string): Promise<Statement> {
    //     return this.post({ action: 'prepare', sql })
    //         .then((res: IPrepare) => {
    //             if (res.error) {
    //                 throw res.error;
    //             }
    //             return new Statement(res.stmtID, this.worker, this.jobs);
    //         });
    // }
    close(terminateWorker = false) {
        return this.post({ action: 'close' }).then(res => {
            this.opened = false;
            if (terminateWorker) {
                this.worker.terminate();
                this.worker = null;
                this.initialized = false;
            }
            return res;
        });
    }
    open(buffer) {
        if (!this.worker) {
            this.worker = new Worker('lib/spatiasql-worker.js');
            this.initialized = new Promise((resolve, reject) => {
                this.addJob({ resolve, reject });
            }).then(() => true);
            this.worker.onmessage = (evt) => {
                const job = this.jobs.shift();
                this.ons.jobQueueChange(this.jobs.length);
                if (evt.data.error) {
                    job.reject([evt.data.error, job.userData]);
                }
                else {
                    job.resolve([evt.data, job.userData]);
                }
            };
        }
        let options = { verbose: false, initSpatialMetaData: 'WGS84' };
        return this.post({ action: 'open', buffer, options }).then(opened => {
            this.opened = opened;
            return opened;
        });
    }
    export() {
        return this.post({ action: 'export' }).then(res => {
            return new Uint8Array(res[0]);
        });
    }
    loadshp(tablename, codeset, srid, shpfiles) {
        return this.post({
            action: 'loadshp',
            tablename,
            codeset,
            srid,
            shpfiles
        }).then(res => res);
    }
    asGeoJSON(geoms, options) {
        return this.post({ action: 'asGeoJSON', geoms, options }).then(res => res);
    }
    geomFromGeoJSON(jsons) {
        return this.post({ action: 'geomFromGeoJSON', jsons: jsons }).then(res => res);
    }
    addJob(job) {
        this.jobs.push(job);
        this.ons.jobQueueChange(this.jobs.length);
    }
    async post(data, userData) {
        if (this.initialized !== true)
            await this.initialized;
        if (data.action !== 'open')
            await this.opened;
        if (data.action === 'loadshp') {
            return new Promise((resolve, reject) => {
                this.addJob({ resolve, reject });
                this.worker.postMessage(data, [data.shpfiles.shp, data.shpfiles.dbf, data.shpfiles.shx]);
            });
        }
        else {
            return new Promise((resolve, reject) => {
                this.addJob({ resolve, reject, userData });
                this.worker.postMessage(data);
            });
        }
    }
}
exports.Database = Database;
