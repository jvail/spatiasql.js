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

export enum GeometryFormat { SpatiaLite, GeoPackage, None }


// TODO: remove DataView
export function geometryFormat(data: Uint8Array): GeometryFormat {

    const view = new DataView(data.buffer);

    if (
        view.getUint8(0) === 0 &&
        (view.getUint8(1) === 0 || view.getUint8(1) === 1) &&
        view.getUint8(38) === 124
    ) {
        return GeometryFormat.SpatiaLite;
    }

    if (
        view.getUint16(0).toString(16) === '4750' &&
        (view.getUint8(2) === 1 || view.getUint8(2) === 0)
    ) {
        return GeometryFormat.GeoPackage;
    }

    return GeometryFormat.None;

}

// TODO: remove DataView
export function srid(data: Uint8Array) {

    const view = new DataView(data.buffer);
    if (
        view.getUint8(0) === 0 &&
        (view.getUint8(1) === 0 || view.getUint8(1) === 1) &&
        view.getUint8(38) === 124
    ) {
       return view.getUint32(2, !!view.getUint8(1));
    }

    return -1;

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

//     async get() {
//         return new Promise((resolve, reject) => {
//             this.addJob({ resolve, reject });
//             this.worker.postMessage({
//                 action: 'get',
//                 stmtID: this.stmtID
//             })
//         });
//     }

//     async getAsObject() {
//         return new Promise((resolve, reject) => {
//             this.addJob({ resolve, reject });
//             this.worker.postMessage({
//                 action: 'getAsObject',
//                 stmtID: this.stmtID
//             })
//         });
//     }

//     async free() {
//         return new Promise((resolve, reject) => {
//             this.addJob({ resolve, reject });
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
    private ons = {
        jobQueueChange: (no: number) => {}
    };

    constructor(buffer?: ArrayBuffer) {
        this.open(buffer).catch((err) => {
            throw err;
        });
    }

    busy(): boolean {
        return !!this.jobs.length;
    }

    on(name: string, fn: Function) {
        if (this.ons[name]) {
            this.ons[name] = fn;
        }
    }

    off(name: string) {
        if (this.ons[name]) {
            this.ons[name] = () => {};
        }
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
                this.addJob({ resolve, reject });
            }).then(() => true);
            this.worker.onmessage = (evt) => {
                const job = this.jobs.shift();
                this.ons.jobQueueChange(this.jobs.length);
                if (evt.data.error) {
                    job.reject([evt.data.error, job.userData]);
                } else {
                    job.resolve([evt.data, job.userData]);
                }
            };
        }
        return this.post({ action: 'open', buffer }).then(opened => {
            this.opened = opened;
            return opened;
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

    private addJob(job: IJob) {
        this.jobs.push(job);
        this.ons.jobQueueChange(this.jobs.length);
    }

    private async post(data: PostData, userData?: any) : Promise<any> {
        if (this.initialized !== true) await this.initialized;
        if (data.action !== 'open') await this.opened;
        if (data.action === 'loadshp') {
            return new Promise((resolve, reject) => {
                this.addJob({ resolve, reject });
                this.worker.postMessage(data, [data.shpfiles.shp, data.shpfiles.dbf, data.shpfiles.shx]);
            });

        } else {
            return new Promise((resolve, reject ) => {
                this.addJob({ resolve, reject, userData });
                this.worker.postMessage(data);
            });
        }
    }
}
