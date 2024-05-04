import { LocalDatabasev2, handleFile } from "./localdatabasev2";

const db=new LocalDatabasev2('file',{name:'test2'});
interface User{
    id:string;
    name:string;
    age:number;
}
const userDb=db.from<User>("users");
// userDb.add({name:'abc',age:14},true);
const users=userDb.litmit(2)

// const users=userDb.search({id:'denlqpzmfyb-lvritgjc'});
// console.log("test-001",{user});
// users.delete();
console.log("test-002",{users:users.select()})

users.delete();
console.log("test-003",{users:userDb.select()})