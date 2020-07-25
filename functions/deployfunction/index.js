const tcb = require("@cloudbase/node-sdk");
const request = require('request');
const fs = require("fs");
const path = require("path");
const crypto = require('crypto');

const cloud = tcb.init({
    env: ""
});
const db = cloud.database();
const _ = db.command;

function CallWeb(access_token, api_name, data) {
    return new Promise((resolve, reject) => {
        request({
            url: `https://api.weixin.qq.com/tcb/${api_name}?access_token=${access_token}`,
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
function uploadWeb(data,headers) {
    return new Promise((resolve, reject) => {
        let head_arr = headers.split('\r\n');
        let head_json = {};
        for(let i of head_arr){
            let temp = i.split(':');
            head_json[temp[0]]=temp[1];
        }
        console.log(head_json);
        request({
            url: 'https://scf.tencentcloudapi.com',
            body: JSON.stringify(data),
            headers:head_json,
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
    let { appid,env } = event;
    if (appid != null && env != null) {
        let access_token = (await cloud.callFunction({
            name: 'getAuthToken',
            data: {
                appid: appid
            }
        })).result;
        if (access_token != null) {
            let result1 = await CallWeb(access_token, "getcodesecret", {});
            console.log(result1);
            let res1 = JSON.parse(result1);
            if (res1.errcode == 0) {
                let codesecret = res1.codesecret;
                let ZipFile = fs.readFileSync(path.resolve(__dirname, "./test.zip"), {
                    encoding: "base64",
                  });
                let uploadBody = JSON.stringify({
                    CodeSecret: codesecret,
                    EnvId: env,
                    FunctionName:'test',
                    Handler: 'index.main',
                    ZipFile,
                    InstallDependency:'TRUE'
                });
                let hashed_payload = crypto.createHash('sha256').update(uploadBody).digest('hex').toLowerCase();
                console.log(uploadBody,hashed_payload);
                let result2 = await CallWeb(access_token, "getuploadsignature", { hashed_payload: hashed_payload});
                console.log(result2);
                let res2 = JSON.parse(result2);
                if (res2.errcode == 0) {
                    let result3 = await uploadWeb({
                        CodeSecret: codesecret,
                        EnvId: env,
                        FunctionName:'test',
                        Handler: 'index.main',
                        ZipFile,
                        InstallDependency:'TRUE'
                    },res2.headers);
                    console.log(result3);
                    return result3;
                }
                else{
                    return {
                        code:-1,
                        msg:'uploadsignature fail!'
                    };
                }
            }
            else{
                return {
                    code:-1,
                    msg:'codesecret fail!'
                };
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