interface IJob {
    resolve: Function;
    reject: Function;
    stmtID?: number;
}

export interface IPrepare {
    stmtID: number;
    error?: string;
}

export interface IResult {
    columns: string[];
    values: any[];
    error?: string;
}

export interface IStatement {
    bind(params: any[]): Promise<{}>;
    step(): AsyncIterableIterator<boolean>;
    get(): Promise<{}>;
    free(): Promise<{}>;
}

export interface IShpFiles {
    shx: ArrayBuffer;
    shp: ArrayBuffer;
    dbf: ArrayBuffer;
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
}

class Statement implements IStatement {

    constructor(private stmtID: number, private worker: Worker, private jobs: IJob[]) {}

    async bind(params: any[]) {
        return new Promise((resolve, reject) => {
            this.jobs.push({ resolve, reject });
            this.worker.postMessage({
                action: 'bind',
                params: params,
                stmtID: this.stmtID
            })
        });
    }

    async *step(): AsyncIterableIterator<boolean> {
        while (true) {
            let row = await new Promise((resolve, reject) => {
                this.jobs.push({ resolve, reject });
                this.worker.postMessage({
                    action: 'step',
                    stmtID: this.stmtID
                });
            });
            if (row) {
                yield true;
            } else {
                return false
            }
        }
    }

    async get() {
        return new Promise((resolve, reject) => {
            this.jobs.push({ resolve, reject });
            this.worker.postMessage({
                action: 'get',
                stmtID: this.stmtID
            })
        });
    }

    async getAsObject() {
        return new Promise((resolve, reject) => {
            this.jobs.push({ resolve, reject });
            this.worker.postMessage({
                action: 'getAsObject',
                stmtID: this.stmtID
            })
        });
    }

    async free() {
        return new Promise((resolve, reject) => {
            this.jobs.push({ resolve, reject });
            this.worker.postMessage({
                action: 'free',
                stmtID: this.stmtID
            })
        });
    }
}

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

    async exec(sql: string, params?: any[]) : Promise<IResult> {
        return this.post({ action: 'exec', sql, params });
    }

    async prepare(sql: string): Promise<Statement> {
        return this.post({ action: 'prepare', sql })
            .then((res: IPrepare) => {
                if (res.error) {
                    throw res.error;
                }
                return new Statement(res.stmtID, this.worker, this.jobs);
            });
    }

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
            this.worker.onmessage = (evt) => this.jobs.shift().resolve(evt.data);
        }
        return this.post({ action: 'open', buffer }).then(res => {
            this.opened = res;
            return res;
        });
    }

    async export(): Promise<Uint8Array> {
        return this.post({ action: 'export' }).then(res => {
            return new Uint8Array(res);
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

    private async post(data: PostData) : Promise<any> {
        if (this.initialized !== true) await this.initialized;
        if (data.action !== 'open') await this.opened;
        if (data.action === 'loadshp') {
            return new Promise((resolve, reject) => {
                this.jobs.push({ resolve, reject });
                this.worker.postMessage(data, [data.shpfiles.shp, data.shpfiles.dbf, data.shpfiles.shx]);
            });

        } else {
            return new Promise((resolve, reject) => {
                this.jobs.push({ resolve, reject });
                this.worker.postMessage(data);
            });
        }
    }
}
