const tcb = require("@cloudbase/node-sdk");
const request = require('request');
const { component_appid } = require('./key.json');

const cloud = tcb.init({
    env: ""
});
const db = cloud.database();
const _ = db.command;

function CallWeb(refresh_token, access_token, auth_appid) {
    return new Promise((resolve, reject) => {
        request({
            url: 'https://api.weixin.qq.com/cgi-bin/component/api_authorizer_token?component_access_token=' + access_token,
            body: JSON.stringify({
                component_appid: component_appid,
                authorizer_appid: auth_appid,
                authorizer_refresh_token: refresh_token
            }),
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
    console.log(event);
    if(event.appid==null)return;
    try {
        let auth_data = (await db.collection('mini').where({ appid: event.appid }).get()).data;

        if (auth_data.length != 0) {

            let { access_token, access_time, refresh_token } = auth_data[0];
            let overtime = new Date((new Date()).valueOf() + 60 * 1000);

            if (access_time > overtime) {
                return access_token;
            }
            else {
                console.log('token timeover!');
                let access_token = (await cloud.callFunction({ name: 'getComToken' })).result;

                if (access_token != null) {
                    let result = await CallWeb(refresh_token, access_token, event.appid);
                    console.log(result);

                    if (result.indexOf('authorizer_access_token') != -1) {
                        let { authorizer_access_token, authorizer_refresh_token, expires_in } = JSON.parse(result);
                        await db.collection('mini').where({appid:event.appid}).update({
                            access_token: authorizer_access_token,
                            access_time: db.serverDate({ offset: expires_in * 1000 }),
                            refresh_token: authorizer_refresh_token
                        });
                        return authorizer_access_token
                    }
                    else {
                        console.log('wxcall failed！', result);
                        return null;
                    }
                }
                else {
                    console.log('token get failed');
                    return null;
                }
            }
        }
        else {
            console.log('can not get appid!');
            return null;
        }
    }
    catch (e) {
        console.log('access get failed!', e);
        return null;
    }
}
