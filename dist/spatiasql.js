"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isGeometryBlob(data) {
    const view = new DataView(data.buffer);
    return (view.getUint8(0) === 0 &&
        (view.getUint8(1) === 0 || view.getUint8(1) === 1) &&
        view.getUint8(38) === 124);
}
exports.isGeometryBlob = isGeometryBlob;
// async generartors do not work with Uglifyjs
// class Statement implements IStatement {
//     constructor(private stmtID: number, private worker: Worker, private jobs: IJob[]) {}
//     async bind(params: any[]) {
//         return new Promise((resolve, reject) => {
//             this.jobs.push({ resolve, reject });
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
//                 this.jobs.push({ resolve, reject });
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
//     async get() {
//         return new Promise((resolve, reject) => {
//             this.jobs.push({ resolve, reject });
//             this.worker.postMessage({
//                 action: 'get',
//                 stmtID: this.stmtID
//             })
//         });
//     }
//     async getAsObject() {
//         return new Promise((resolve, reject) => {
//             this.jobs.push({ resolve, reject });
//             this.worker.postMessage({
//                 action: 'getAsObject',
//                 stmtID: this.stmtID
//             })
//         });
//     }
//     async free() {
//         return new Promise((resolve, reject) => {
//             this.jobs.push({ resolve, reject });
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
        this.open(buffer).catch((err) => {
            throw err;
        });
    }
    busy() {
        return !!this.jobs.length;
    }
    async exec(sql, params, userData) {
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
    async close(terminateWorker = false) {
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
    async open(buffer) {
        if (!this.worker) {
            this.worker = new Worker('lib/spatiasql-worker.js');
            this.initialized = new Promise((resolve, reject) => {
                this.jobs.push({ resolve, reject });
            }).then(() => this.initialized = true);
            this.worker.onmessage = (evt) => {
                const job = this.jobs.shift();
                if (evt.data.error) {
                    job.reject([evt.data.error, job.userData]);
                }
                else {
                    job.resolve([evt.data, job.userData]);
                }
            };
        }
        return this.post({ action: 'open', buffer }).then(res => {
            this.opened = res;
            return res;
        });
    }
    async export() {
        return this.post({ action: 'export' }).then(res => {
            return new Uint8Array(res);
        });
    }
    async loadshp(tablename, codeset, srid, shpfiles) {
        return this.post({
            action: 'loadshp',
            tablename,
            codeset,
            srid,
            shpfiles
        }).then(res => res);
    }
    async asGeoJSON(geoms, options) {
        return this.post({ action: 'asGeoJSON', geoms, options }).then(res => res);
    }
    async geomFromGeoJSON(jsons) {
        return this.post({ action: 'geomFromGeoJSON', jsons: jsons }).then(res => res);
    }
    async post(data, userData) {
        if (this.initialized !== true)
            await this.initialized;
        if (data.action !== 'open')
            await this.opened;
        if (data.action === 'loadshp') {
            return new Promise((resolve, reject) => {
                this.jobs.push({ resolve, reject });
                this.worker.postMessage(data, [data.shpfiles.shp, data.shpfiles.dbf, data.shpfiles.shx]);
            });
        }
        else {
            return new Promise((resolve, reject) => {
                this.jobs.push({ resolve, reject, userData });
                this.worker.postMessage(data);
            });
        }
    }
}
exports.Database = Database;
