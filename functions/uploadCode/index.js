const tcb = require("@cloudbase/node-sdk");
const request = require('request');

const cloud = tcb.init({
    env: ""
});
const db = cloud.database();
const _ = db.command;

function CallWeb(access_token, data) {
    return new Promise((resolve, reject) => {
        request({
            url: `https://api.weixin.qq.com/wxa/commit?access_token=${access_token}`,
            body: JSON.stringify(data),
            method: 'POST'
        }, (error, response, body) => {
            if (error) {
                reject(error);
            }
            resolve(response.body);
        });
    });
}

exports.main = async (event) => {
    let { appid,name } = event;
    if (appid != null && name != null) {
        let access_token = (await cloud.callFunction({
            name: 'getAuthToken',
            data: {
                appid: appid
            }
        })).result;
        if (access_token != null) {
            let result = await CallWeb(access_token, {
                template_id : "2",
                user_version : "1.0.1",
                user_desc : "第三方平台代开发",
                ext_json : `{
                    "extEnable": true,
                    "extAppid": "${appid}",
                    "directCommit": false,
                    "window":{
                      "navigationBarTitleText": "${name}"
                    }}`
            });
            try{
                let res = JSON.parse(result);
                console.log(res);
                return res;
            }
            catch(e){
                console.log(e,result);
                return result;
            }
        }
        else {
            return {
                code: -1,
                msg: 'access_token is null'
            }
        }
    }
    else {
        console.log(event);
        return 404;
    }
}
