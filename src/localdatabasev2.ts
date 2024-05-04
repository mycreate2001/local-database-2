import {existsSync, mkdirSync, readFileSync, writeFile} from 'fs'
import {  resolve } from 'path'
const _FILE_EXT=".json"
const _FILE_PATH_DEFAULT="database.json"
const _FILE_ROOT_DEFAULT="storage"
const _STOR_PREFIX_="_DB";
const _STOR_DB="localDb"

/////////////// CLASSES ///////////////////////////////

/** class make localdatabase */
/* The `LocalDatabase` class is a TypeScript class that provides functionality for managing a local
database using either file storage or local storage. */
export class LocalDatabasev2{
    private _db:any={};                     // keep databse
    private _backup:LocalDbHandleBackup     // backup method from _db
    private _restore:LocalDbHandleRetore    // restore method to _db
    
    /**
     * The constructor function initializes a database based on the specified handle type (file, local
     * storage, or custom) and options provided.
     * @param {'file'|'localstorage'|LocalDbHandle} handle - The `handle` parameter in the constructor
     * function can have one of three possible values:
     * @param opts - The `opts` parameter is an object that allows you to provide additional options
     * when creating an instance of the `constructor` class. It is of type `Partial<LocalDbOpts>`,
     * which means that all properties of `LocalDbOpts` are optional. This gives you the flexibility to
     * pass only
     * @example import {LocalDatabasev2} from 'localdatabasev2'
     * const db=new LocalDatabasev2('file',{name:'database'})
     * const userDb=db.from<User>('users');
     * //add new data
     * userDb.add()
     * const users=userDb.select("id,name");//get all users with {id,name}
     * const spUsers=userDb.search({role:'admin'}).select();        //get all user has role='admin'
     */
    constructor(handle:'file'|'localstorage'|LocalDbHandle, opts:Partial<LocalDbOpts>={}){
        // keep database as json file
        if(handle==='file'){
            const root=opts.root||_FILE_ROOT_DEFAULT
            const path=[root,opts.name||_FILE_PATH_DEFAULT].filter(x=>!!x).join("/")
            const file=handleFile(path);
            this._backup=file.backup;
            this._restore=file.restore;
        }

        // store database as localStorage, it's apply for web browser
        else if(handle==='localstorage'){
            const prefix=opts.root||_STOR_PREFIX_
            const name=[opts.name||_STOR_DB,prefix].filter(x=>!!x).join("_")
            const storage=handleLocalStorage(name);
            this._backup=storage.backup;
            this._restore=storage.restore;
        }

        // store database with other method
        else {
            this._backup=handle.backup;
            this._restore=handle.restore;
        }

        //init
        this._db=this._restore();
    }

    /**
     * The function `from` in TypeScript creates a new instance of `LocalDbs` with a specified table
     * and provides a backup function.
     * @param {string} tbl - The `tbl` parameter is a string representing the name of the table in the
     * database from which data will be retrieved.
     * @returns An instance of the `LocalDbs` class is being returned, initialized with the array
     * `_arrs` and the `backup` function.
     */
    from<T extends{id:string}>(tbl:string):LocalDbs<T>{
        if(!this._db[tbl]) this._db[tbl]=[];
        let _arrs=this._db[tbl] as T[];
        const backup=()=>this._backup(this._db)
        const out=new LocalDbs(_arrs,backup);
        return out;
    }
}


/** FOR EACH DATA */
/* The `LocalDb` class in TypeScript is a generic class that provides methods for selecting, updating,
and deleting data items based on a specified type with an `id` property. */
export class LocalDb<T extends {id:string}>{
    constructor(private data:T,private commit:Function|null=null,private _db:T[]){}
    select(...items:string[]):object{
        const out:any={}
        items.forEach(key=>{
            const val=(this.data as any)[key];
            if(val===undefined) return;
            out[key]=val;
        })
        return out;
    }

    update(newData:T,isCommit:boolean=true){
        Object.assign(this,newData);
        if(isCommit && this.commit && typeof this.commit==='function') this.commit();
    }

    delete(isCommit:boolean=true){
        const id=this.data.id;
        if(!id ||typeof id!=='string') return;
        const pos=this._db.findIndex(x=>x.id===id);
        this._db.splice(pos,1);
        if(isCommit && typeof this.commit==='function') this.commit();
    }
}



/** FOR ARRAYS */
/* The `LocalDbs` class in TypeScript provides methods for searching, adding, selecting, limiting,
deleting, and updating records in a local database array. */
export class LocalDbs<T extends {id:string}>{
    private _db:T[]=[]
    constructor(private arrs:T[],private _commit:Function|null=null){
        this._db=arrs
    }
    search(obj:object):LocalDbs<T>{
        Object.keys(obj).forEach(key=>{
            const sVal=(obj as any)[key];
            this.arrs=this.arrs.filter(x=>(x as any)[key]===sVal)
        })
        return this;
    }

    /** add new record */
    add(data:T|Omit<T,"id">,isCommit:boolean=true):LocalDb<T>{
        const id=(data as any).id||uuid()
        const newData={...data,id} as T
        this.arrs.push(newData);
        if(isCommit && typeof this._commit==='function') this._commit();
        return new LocalDb(newData,this._commit,this._db)
    }

    single(pos:number=0):LocalDb<T>{
        const that=this;
        return new LocalDb(this.arrs[pos],that._commit,this._db)
    }

    litmit(qty:number,type:'first'|'last'='first'):LocalDbs<T>{
        if(qty<this.arrs.length){
            switch(type){
                case 'first':
                this.arrs=this.arrs.slice(0,qty);
                break;

                case 'last':
                const len:number=this.arrs.length
                this.arrs=this.arrs.slice(len-qty,len)
                break;

                default:
                    console.log("\n#WARINING: it's diffirence from type list")
            }
        }
        return this;
    }

    select(...items:string[]):object[]{
        const results:object[]=[];
        if(!items.length) return JSON.parse(JSON.stringify(this.arrs))
        this.arrs.forEach(data=>{
            const out:any={};
            items.forEach(key=>{
                const val=(data as any)[key];
                if(val===undefined) return;
                out[key]=val;
            })
            results.push(out);
        })
        return JSON.parse(JSON.stringify(results));
    }

    /** delete series database */
    delete(isCommit:boolean=true){
        this.arrs.forEach(data=>{
            const id=data.id;
            if(!id ||typeof id!=='string') return;//dont have id => ignore
            const pos=this._db.findIndex(x=>x.id===id);
            this._db.splice(pos,1)
        })
        if(isCommit && typeof this._commit==='function') this._commit();
    }

    /** update serial database */
    update(newData:T,isCommit:boolean=true):LocalDbs<T>{
        this.arrs=this.arrs.map(data=>Object.assign({},data,newData))
        if(isCommit && this._commit && typeof this._commit==='function') this._commit();
        return this;
    }
}


////////////// SOME FUNCTIONS ////////////////////////////


/**
 * The function `handleLocalStorage` in TypeScript provides methods to backup and restore data using
 * the browser's localStorage API.
 * @param {string} [name] - The `name` parameter is a string that represents the name of the local
 * storage key where the data will be stored or retrieved from. If no `name` is provided, a default
 * name will be generated using the `_STOR_PREFIX_` and `_STOR_DB` constants.
 * @returns The function `handleLocalStorage` returns an object with two methods: `backup` and
 * `restore`. The `backup` method stores data in the local storage using the provided name, and the
 * `restore` method retrieves and parses the stored data from the local storage using the same name.
 */
export function handleLocalStorage(name:string=''):LocalDbHandle{
    if(!name) name=[_STOR_PREFIX_,_STOR_DB].join("_")
   return{
    backup(data) {
        localStorage.setItem(name,JSON.stringify(data));
        return Promise.resolve(name)
    },
    restore() {
        try{
            const str=localStorage.getItem(name);
            if(!str) return {};
            return JSON.parse(str)
        }
        catch(err){
            console.log("restore is error");
            return {}
        }
    },
   }
}

/**
 * The function `handleFile` in TypeScript handles file operations such as backing up data to a JSON
 * file and restoring data from it.
 * @param {string} [path=database.json] - The `path` parameter in the `handleFile` function is a string
 * that represents the file path where the database file will be stored or retrieved. If no path is
 * provided, it defaults to `'database.json'`. This path can be a relative or absolute path to the
 * file.
 * @returns The `handleFile` function returns an object with two properties: `backup` and `restore`.
 */
export function handleFile(path:string='database.json'):LocalDbHandle{
    //handle path
    if(!path.length) path=_FILE_PATH_DEFAULT
    if(!path.toLowerCase().endsWith(_FILE_EXT)) path+=_FILE_EXT

    const paths:string[]=path.split("/");   //full path
    const dirs:string[]=paths.length>1?paths.slice(0,paths.length-1):[];//root
    //make folder if not exist
    if(dirs.length){
        const root:string=resolve(...dirs)
        if(!existsSync(root)) mkdirSync(root);
    }
    path=resolve(...paths);
    //create file if not exist
    if(!existsSync(resolve(...paths))) backup({})

    /**
     * The function `backup` takes any data, converts it to a JSON string, and writes it to a file,
     * returning a promise that resolves with the file path upon successful write.
     * @param {any} data - The `data` parameter in the `backup` function is of type `any`, which means
     * it can accept any data type. It is the data that you want to backup or store in a file.
     * @returns A Promise is being returned, which will resolve with a string representing the path
     * where the data was backed up, or reject with an error if there was an issue during the backup
     * process.
     */
    function backup(data:any){
        return new Promise<string>((resolve,reject)=>{
            const str=JSON.stringify(data);
            writeFile(path,str,{encoding:'utf8'},(err)=>{
                if(err) return reject(err);
                return resolve(path)   
            })
        })
    }

    /**
     * The function `restore` attempts to read and parse a JSON file, returning the data if successful
     * or an empty object if there is an error.
     * @returns The `restore` function is attempting to read a file specified by the `path` variable,
     * parse its contents as JSON, and return the data. If the file does not exist or an error occurs
     * during the process, an empty object `{}` is returned.
     */
    function restore() {
        try{
            if(!existsSync(path)) throw new Error("not exist file:"+path)
            const txt=readFileSync(path,{encoding:'utf8',flag:'r+'})
            if(!txt) return {}
            const data=JSON.parse(txt);
            return data;
        }
        catch(err){
            console.log("\n### ERROR ###\n[restore] restore is error ",err);
            return {}
        }
    }

    //returen result
    return {backup,restore}
}



/**
 * The function generates a unique UUID by combining a random string and the current timestamp,
 * ensuring it is not already in a given list.
 * @param {string[]} list - The `list` parameter in the `uuid` function is an optional array of
 * strings. It is used to store existing UUIDs to ensure that the generated UUID is unique and does not
 * already exist in the list. If the `list` parameter is not provided, an empty array `[]` is
 * @returns The `uuid` function returns a randomly generated unique identifier (UUID) as a string.
 */
function uuid(list:string[]=[]):string{
    let isDone:boolean=false;
    let id:string=''
    while(!isDone){
        id=[Math.random().toString(36).substring(2),Date.now().toString(36)].join("-");
        if(!list.includes(id)) isDone=true;
    }
    return id;
}



///////////////// INTERFACES /////////////////////////
export interface LocalDbHandle{
    backup:(data:object)=>Promise<any>; // HANDLE BACKUP DATA FROM LOCAL VARIAL
    restore:()=>object;                 // hanle restore database from record
}

export type LocalDbHandleBackup=(data:object)=>Promise<any>
export type LocalDbHandleRetore=()=>object
export interface LocalDbOpts{
    name:string;
    root:string;        // root direction for file, prefix for localstorage
}
