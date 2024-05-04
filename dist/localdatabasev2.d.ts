export interface LocalDbHandle {
    backup: (data: object) => Promise<any>;
    restore: () => object;
}
export type LocalDbHandleBackup = (data: object) => Promise<any>;
export type LocalDbHandleRetore = () => object;
export interface LocalDbOpts {
    name: string;
    root: string;
}
export declare class LocalDatabase {
    private _db;
    private _backup;
    private _restore;
    constructor(handle: 'file' | 'localstorage' | LocalDbHandle, opts?: Partial<LocalDbOpts>);
    from<T extends {
        id: string;
    }>(tbl: string): LocalDbs<T>;
}
export declare class LocalDb<T extends {
    id: string;
}> {
    private data;
    private commit;
    private _db;
    constructor(data: T, commit: Function | null, _db: T[]);
    select(...items: string[]): object;
    update(newData: T, isCommit?: boolean): void;
    delete(isCommit?: boolean): void;
}
export declare class LocalDbs<T extends {
    id: string;
}> {
    private arrs;
    private _commit;
    private _db;
    constructor(arrs: T[], _commit?: Function | null);
    search(obj: object): LocalDbs<T>;
    add(data: T | Omit<T, "id">, isCommit?: boolean): LocalDb<T>;
    single(pos?: number): LocalDb<T>;
    litmit(qty: number, type?: 'first' | 'last'): LocalDbs<T>;
    select(...items: string[]): object[];
    delete(isCommit?: boolean): void;
    update(newData: T, isCommit?: boolean): LocalDbs<T>;
}
export declare function handleLocalStorage(name?: string): LocalDbHandle;
export declare function handleFile(path?: string): LocalDbHandle;
