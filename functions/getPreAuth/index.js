const tcb = require("@cloudbase/node-sdk");
const request = require('request');
//获取相关的第三方平台信息
const { component_appid } = require('./key.json');

const cloud = tcb.init({
    env: ""//此处填写自己的云开发环境ID
});
const db = cloud.database();
const _ = db.command;

//封装的http请求函数
function CallWeb(token) {
    return new Promise((resolve, reject) => {
        request({
            url: 'https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=' + token,
            body: JSON.stringify({
                component_appid
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
    //此云函数是由后台管理页面请求的，在调用此云函数时就意味着想要创建一个授权的对象，name是对这个对象的备注
    if(event.name==null||event.name=='') return null;
    try {
        //通过调用getComToken云函数获取第三方令牌
        let access_token = (await cloud.callFunction({ name: 'getComToken' })).result;

        if (access_token != null) {
            //将令牌信息传入http请求函数，等待请求结果
            let result = await CallWeb(access_token);

            //结果是一个json字符串，验证是否有pre_auth_code字样，如果有则没有报错
            if (result.indexOf('pre_auth_code') != -1) {
                
                //解析字符串为json
                let { pre_auth_code, expires_in } = JSON.parse(result);

                //拼接授权链接，根据此文档：https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/Authorization_Process_Technical_Description.html
                let auth_url = `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${component_appid}&pre_auth_code=${pre_auth_code}&redirect_uri=https://w.cloudbase.vip&auth_type=2`;
                
                //将授权链接保存到云开发数据库中的mini集合内
                return await db.collection('mini').add({
                    status: 0,
                    name:event.name,
                    url: auth_url,
                    time: db.serverDate({
                        offset: expires_in * 1000
                    })
                })
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
    catch (e) {
        console.log('get failed!', e);
        return null;
    }
}
