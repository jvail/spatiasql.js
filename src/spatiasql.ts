interface IJob {
    resolve: Function;
    reject: Function;
    stmtID?: number;
    userData?: any;
}

export interface IPrepare {
    stmtID: number;
    error?: string;
}

export interface IResult {
    columns: string[];
    values: any[];
}

// export interface IStatement {
//     bind(params: any[]): Promise<{}>;
//     step(): AsyncIterableIterator<boolean>;
//     get(): Promise<{}>;
//     free(): Promise<{}>;
// }

export interface IShpFiles {
    shx: ArrayBuffer;
    shp: ArrayBuffer;
    dbf: ArrayBuffer;
}

export interface IGeoJSONOptions {
    bbox?: boolean;
    precision?: number;
}

export function isGeometryBlob(data: Uint8Array) {

    const view = new DataView(data.buffer);
    return (
        view.getUint8(0) === 0 &&
        (view.getUint8(1) === 0 || view.getUint8(1) === 1) &&
        view.getUint8(38) === 124
    );
}

interface PostData {
    action: string;
    sql?: string;
    stmtID?: number;
    buffer?: ArrayBuffer;
    params?: any[];
    tablename?: string;
    codeset?: string;
    srid?: number;
    shpfiles?: IShpFiles;
    geoms?: Uint8Array[];
    jsons?: JSON[];
    options?: IGeoJSONOptions
}

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

export class Database {
    private worker: Worker = null;
    private jobs: IJob[] = [];
    private initialized: Promise<boolean>|boolean = false;
    private opened: Promise<boolean>|boolean = false;

    constructor(buffer?: ArrayBuffer) {
        this.open(buffer).catch((err) => {
            throw err;
        });
    }

    busy(): boolean {
        return !!this.jobs.length;
    }

    async exec(sql: string, params?: any[], userData?: any) : Promise<[IResult[], any]> {
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

    async close(terminateWorker: boolean = false) : Promise<boolean> {
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

    async open(buffer?: ArrayBuffer) : Promise<boolean> {
        if (!this.worker) {
            this.worker = new Worker('lib/spatiasql-worker.js');
            this.initialized = new Promise((resolve, reject) => {
                this.jobs.push({ resolve, reject });
            }).then(() => this.initialized = true);
            this.worker.onmessage = (evt) => {
                const job = this.jobs.shift();
                if (evt.data.error) {
                    job.reject([evt.data.error, job.userData]);
                } else {
                    job.resolve([evt.data, job.userData]);
                }
            };
        }
        return this.post({ action: 'open', buffer }).then(res => {
            this.opened = res;
            return res;
        });
    }

    async export(): Promise<Uint8Array> {
        return this.post({ action: 'export' }).then(res => {
            return new Uint8Array(res[0]);
        });
    }

    async loadshp(tablename: string, codeset: string, srid: number, shpfiles: IShpFiles) : Promise<boolean> {
        return this.post({
                action: 'loadshp',
                tablename,
                codeset,
                srid,
                shpfiles
            }).then(res => res);
    }

    async asGeoJSON(geoms: Uint8Array[], options?: IGeoJSONOptions) {
        return this.post({ action: 'asGeoJSON', geoms, options }).then(res => res);
    }

    async geomFromGeoJSON(jsons: JSON[]) {
        return this.post({ action: 'geomFromGeoJSON', jsons: jsons }).then(res => res);
    }

    private async post(data: PostData, userData?: any) : Promise<any> {
        if (this.initialized !== true) await this.initialized;
        if (data.action !== 'open') await this.opened;
        if (data.action === 'loadshp') {
            return new Promise((resolve, reject) => {
                this.jobs.push({ resolve, reject });
                this.worker.postMessage(data, [data.shpfiles.shp, data.shpfiles.dbf, data.shpfiles.shx]);
            });

        } else {
            return new Promise((resolve, reject ) => {
                this.jobs.push({ resolve, reject, userData });
                this.worker.postMessage(data);
            });
        }
    }
}
