# install
`npm i https://github.com/mycreate2001/local-database-2.git`

# use
## samples
### sample1

```typescript
import {LocalDatabasev2} from 'localdatabasev2'
const db=new LocalDatabasev2('file');
//add user
const user={id:'123',name:'abc',age:20}; //id always exist, if your data dont have id or empty, LocalDatabasev2 automatically generate id
db.from('users').add(user);
//read data
const user1=db.from('users').search({id:'123'}).single().select();//user1={id:'123',name:'abc',age:20}

```