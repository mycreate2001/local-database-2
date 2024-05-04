"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const localdatabasev2_1 = require("./localdatabasev2");
const db = new localdatabasev2_1.LocalDatabase('file', { name: 'test2' });
const userDb = db.from("users");
const users = userDb.litmit(2);
console.log("test-002", { users: users.select() });
users.delete();
console.log("test-003", { users: userDb.select() });
