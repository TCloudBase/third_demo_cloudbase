const tcb = require("@cloudbase/node-sdk");

const cloud = tcb.init({
    env: ""
});
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
    //从event中可以获取到HTTP请求的有关信息

    //event.body即为请求体
    let msg_body = event.body;

    /*event.queryStringParameters中可以获得请求参数，取出以下三个内容
     - timestamp 时间戳
     - nonce 随机数
     - msg_signature 消息体签名，用于验证消息体的正确 */
    let { msg_signature, nonce, timestamp } = event.queryStringParameters;

    //判断签名是否不为空，过滤一些非开放平台的无效请求
    if (msg_signature != null) {

        //针对信息进行base64解码
        let encryptedMsg = Buffer.from(msg_body, 'base64').toString();

        //取出加密的encrypt，在这里没有使用XML方式读取
        let encrypt = encryptedMsg.slice(encryptedMsg.indexOf('<Encrypt><![CDATA[') + 18, encryptedMsg.indexOf(']]></Encrypt>'));

        //引入util.js文件，命名为WechatEncrypt，此js包含解码的所有逻辑
        const WechatEncrypt = require('./util');

        //引入key.json，在这里存储了第三方平台设置的key，随机码，appid等
        const WXKEY = require('./key.json');

        //将key.json的内容代入，创建WechatEncrypt实例
        const wechatEncrypt = new WechatEncrypt(WXKEY);

        //将timestamp 时间戳、nonce 随机数、加密的encrypt代入gensign函数进行签名处理
        let signature = wechatEncrypt.genSign({ timestamp, nonce, encrypt });

        //判断签名是否和传来的参数签名一致
        if (signature === msg_signature) {

            //将加密的encrypt直接代入decode函数进行解码,返回解码后的明文
            let xml = wechatEncrypt.decode(encrypt);

            //判断明文中是否有ComponentVerifyTicket字段，由此来判断此为验证票据
            if (xml.indexOf('ComponentVerifyTicket') != -1) {

                //取出相应的票据，在这里没有使用XML方式读取
                let ticket = xml.slice(xml.indexOf('ticket@@@'), xml.indexOf(']]></ComponentVerifyTicket>'));
                try {

                    //将票据信息保存到云开发数据库中wxid集合中，component_verify_ticket文档中，在使用前需要在控制台创建集合并设置文档
                    db.collection('wxid').doc('component_verify_ticket').update({
                        time: db.serverDate(),//更新的时间
                        value: ticket
                    });
                }
                catch (e) {
                    console.log('save failed！', e);
                }
            }
            return 'success';
        }
        else {
            return 'error';
        }

    }
    else {
        return 404;
    }
}







