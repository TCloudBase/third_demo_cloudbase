const tcb = require("@cloudbase/node-sdk");

const cloud = tcb.init({
    env: ""
});
const db = cloud.database();

exports.main = async event => {
    if(event.id!=null){
        return await db.collection('mini').where({
            _id:event.id
        }).remove();
    }
    else{
        return null;
    }
}