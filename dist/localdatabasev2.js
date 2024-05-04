"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleFile = exports.handleLocalStorage = exports.LocalDbs = exports.LocalDb = exports.LocalDatabase = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const _FILE_EXT = ".json";
const _FILE_PATH_DEFAULT = "database.json";
const _FILE_ROOT_DEFAULT = "storage";
const _STOR_PREFIX_ = "_DB";
const _STOR_DB = "localDb";
class LocalDatabase {
    constructor(handle, opts = {}) {
        this._db = {};
        if (handle === 'file') {
            const root = opts.root || _FILE_ROOT_DEFAULT;
            const path = [root, opts.name || _FILE_PATH_DEFAULT].filter(x => !!x).join("/");
            const file = handleFile(path);
            this._backup = file.backup;
            this._restore = file.restore;
        }
        else if (handle === 'localstorage') {
            const prefix = opts.root || _STOR_PREFIX_;
            const name = [opts.name || _STOR_DB, prefix].filter(x => !!x).join("_");
            const storage = handleLocalStorage(name);
            this._backup = storage.backup;
            this._restore = storage.restore;
        }
        else {
            this._backup = handle.backup;
            this._restore = handle.restore;
        }
        this._db = this._restore();
    }
    from(tbl) {
        if (!this._db[tbl])
            this._db[tbl] = [];
        let _arrs = this._db[tbl];
        const backup = () => this._backup(this._db);
        const out = new LocalDbs(_arrs, backup);
        return out;
    }
}
exports.LocalDatabase = LocalDatabase;
class LocalDb {
    constructor(data, commit = null, _db) {
        this.data = data;
        this.commit = commit;
        this._db = _db;
    }
    select(...items) {
        const out = {};
        items.forEach(key => {
            const val = this.data[key];
            if (val === undefined)
                return;
            out[key] = val;
        });
        return out;
    }
    update(newData, isCommit = true) {
        Object.assign(this, newData);
        if (isCommit && this.commit && typeof this.commit === 'function')
            this.commit();
    }
    delete(isCommit = true) {
        const id = this.data.id;
        if (!id || typeof id !== 'string')
            return;
        const pos = this._db.findIndex(x => x.id === id);
        this._db.splice(pos, 1);
        if (isCommit && typeof this.commit === 'function')
            this.commit();
    }
}
exports.LocalDb = LocalDb;
class LocalDbs {
    constructor(arrs, _commit = null) {
        this.arrs = arrs;
        this._commit = _commit;
        this._db = [];
        this._db = arrs;
    }
    search(obj) {
        Object.keys(obj).forEach(key => {
            const sVal = obj[key];
            this.arrs = this.arrs.filter(x => x[key] === sVal);
        });
        return this;
    }
    add(data, isCommit = true) {
        const id = data.id || uuid();
        const newData = Object.assign(Object.assign({}, data), { id });
        this.arrs.push(newData);
        if (isCommit && typeof this._commit === 'function')
            this._commit();
        return new LocalDb(newData, this._commit, this._db);
    }
    single(pos = 0) {
        const that = this;
        return new LocalDb(this.arrs[pos], that._commit, this._db);
    }
    litmit(qty, type = 'first') {
        if (qty < this.arrs.length) {
            switch (type) {
                case 'first':
                    this.arrs = this.arrs.slice(0, qty);
                    break;
                case 'last':
                    const len = this.arrs.length;
                    this.arrs = this.arrs.slice(len - qty, len);
                    break;
                default:
                    console.log("\n#WARINING: it's diffirence from type list");
            }
        }
        return this;
    }
    select(...items) {
        const results = [];
        if (!items.length)
            return JSON.parse(JSON.stringify(this.arrs));
        this.arrs.forEach(data => {
            const out = {};
            items.forEach(key => {
                const val = data[key];
                if (val === undefined)
                    return;
                out[key] = val;
            });
            results.push(out);
        });
        return JSON.parse(JSON.stringify(results));
    }
    delete(isCommit = true) {
        this.arrs.forEach(data => {
            const id = data.id;
            if (!id || typeof id !== 'string')
                return;
            const pos = this._db.findIndex(x => x.id === id);
            this._db.splice(pos, 1);
        });
        if (isCommit && typeof this._commit === 'function')
            this._commit();
    }
    update(newData, isCommit = true) {
        this.arrs = this.arrs.map(data => Object.assign({}, data, newData));
        if (isCommit && this._commit && typeof this._commit === 'function')
            this._commit();
        return this;
    }
}
exports.LocalDbs = LocalDbs;
function handleLocalStorage(name = '') {
    if (!name)
        name = [_STOR_PREFIX_, _STOR_DB].join("_");
    return {
        backup(data) {
            localStorage.setItem(name, JSON.stringify(data));
            return Promise.resolve(name);
        },
        restore() {
            try {
                const str = localStorage.getItem(name);
                if (!str)
                    return {};
                return JSON.parse(str);
            }
            catch (err) {
                console.log("restore is error");
                return {};
            }
        },
    };
}
exports.handleLocalStorage = handleLocalStorage;
function handleFile(path = 'database.json') {
    if (!path.length)
        path = _FILE_PATH_DEFAULT;
    if (!path.toLowerCase().endsWith(_FILE_EXT))
        path += _FILE_EXT;
    const paths = path.split("/");
    const dirs = paths.length > 1 ? paths.slice(0, paths.length - 1) : [];
    if (dirs.length) {
        const root = (0, path_1.resolve)(...dirs);
        if (!(0, fs_1.existsSync)(root))
            (0, fs_1.mkdirSync)(root);
    }
    path = (0, path_1.resolve)(...paths);
    if (!(0, fs_1.existsSync)((0, path_1.resolve)(...paths)))
        backup({});
    function backup(data) {
        return new Promise((resolve, reject) => {
            const str = JSON.stringify(data);
            (0, fs_1.writeFile)(path, str, { encoding: 'utf8' }, (err) => {
                if (err)
                    return reject(err);
                return resolve(path);
            });
        });
    }
    function restore() {
        try {
            if (!(0, fs_1.existsSync)(path))
                throw new Error("not exist file:" + path);
            const txt = (0, fs_1.readFileSync)(path, { encoding: 'utf8', flag: 'r+' });
            if (!txt)
                return {};
            const data = JSON.parse(txt);
            return data;
        }
        catch (err) {
            console.log("\n### ERROR ###\n[restore] restore is error ", err);
            return {};
        }
    }
    return { backup, restore };
}
exports.handleFile = handleFile;
function uuid(list = []) {
    let isDone = false;
    let id = '';
    while (!isDone) {
        id = [Math.random().toString(36).substring(2), Date.now().toString(36)].join("-");
        if (!list.includes(id))
            isDone = true;
    }
    return id;
}
