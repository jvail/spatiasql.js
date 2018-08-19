export interface IPrepare {
    stmtID: number;
    error?: string;
}
export interface IResult {
    columns: string[];
    values: any[];
}
export interface IShpFiles {
    shx: ArrayBuffer;
    shp: ArrayBuffer;
    dbf: ArrayBuffer;
}
export interface IGeoJSONOptions {
    bbox?: boolean;
    precision?: number;
}
export declare enum GeometryFormat {
    SpatiaLite = 0,
    GeoPackage = 1,
    None = 2
}
export declare function geometryFormat(data: Uint8Array): GeometryFormat;
export declare function srid(data: Uint8Array): number;
export declare class Database {
    private worker;
    private jobs;
    private initialized;
    private opened;
    private ons;
    constructor(buffer?: ArrayBuffer);
    busy(): boolean;
    on(name: string, fn: Function): void;
    off(name: string): void;
    exec(sql: string, params?: any[], userData?: any): Promise<[IResult[], any]>;
    close(terminateWorker?: boolean): Promise<boolean>;
    open(buffer?: ArrayBuffer): Promise<boolean>;
    export(): Promise<Uint8Array>;
    loadshp(tablename: string, codeset: string, srid: number, shpfiles: IShpFiles): Promise<boolean>;
    asGeoJSON(geoms: Uint8Array[], options?: IGeoJSONOptions): Promise<any>;
    geomFromGeoJSON(jsons: JSON[]): Promise<any>;
    private addJob;
    private post;
}
