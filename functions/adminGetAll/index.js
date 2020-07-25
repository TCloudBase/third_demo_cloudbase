const tcb = require("@cloudbase/node-sdk");

const cloud = tcb.init({
    env: ""
});
const db = cloud.database();

exports.main = async event => {
    return await db.collection('mini').get();
}
