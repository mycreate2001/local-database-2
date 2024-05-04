import {existsSync, mkdirSync, readFileSync, writeFile} from 'fs'
import {  resolve } from 'path'
const _FILE_EXT=".json"
const _FILE_PATH_DEFAULT="database.json"
const _FILE_ROOT_DEFAULT="storage"
const _STOR_PREFIX_="_DB";
const _STOR_DB="localDb"

export interface LocalDbHandle{
    backup:(data:object)=>Promise<any>;
    restore:()=>object
}

export type LocalDbHandleBackup=(data:object)=>Promise<any>
export type LocalDbHandleRetore=()=>object
export interface LocalDbOpts{
    name:string;
    root:string;        // root direction for file, prefix for localstorage
}

export class LocalDatabase{
    private _db:any={};
    private _backup:LocalDbHandleBackup
    private _restore:LocalDbHandleRetore
    constructor(handle:'file'|'localstorage'|LocalDbHandle, opts:Partial<LocalDbOpts>={}){
        if(handle==='file'){
            const root=opts.root||_FILE_ROOT_DEFAULT
            const path=[root,opts.name||_FILE_PATH_DEFAULT].filter(x=>!!x).join("/")
            const file=handleFile(path);
            this._backup=file.backup;
            this._restore=file.restore;
        }

        else if(handle==='localstorage'){
            const prefix=opts.root||_STOR_PREFIX_
            const name=[opts.name||_STOR_DB,prefix].filter(x=>!!x).join("_")
            const storage=handleLocalStorage(name);
            this._backup=storage.backup;
            this._restore=storage.restore;
        }
        else {
            this._backup=handle.backup;
            this._restore=handle.restore;
        }

        //init
        this._db=this._restore();
    }

    from<T extends{id:string}>(tbl:string):LocalDbs<T>{
        if(!this._db[tbl]) this._db[tbl]=[];
        let _arrs=this._db[tbl] as T[];
        const backup=()=>this._backup(this._db)
        const out=new LocalDbs(_arrs,backup);
        return out;
    }
}


/** FOR EACH DATA */

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



///////// handle localStorage for web ///////////
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


///////// handle file for both web & server side
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

    function backup(data:any){
        return new Promise<string>((resolve,reject)=>{
            const str=JSON.stringify(data);
            writeFile(path,str,{encoding:'utf8'},(err)=>{
                if(err) return reject(err);
                return resolve(path)   
            })
        })
    }

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

function uuid(list:string[]=[]):string{
    let isDone:boolean=false;
    let id:string=''
    while(!isDone){
        id=[Math.random().toString(36).substring(2),Date.now().toString(36)].join("-");
        if(!list.includes(id)) isDone=true;
    }
    return id;
}
