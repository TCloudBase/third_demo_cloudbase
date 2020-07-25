const fs = require("fs");
const path = require("path");

exports.main = async (event, context) => {
  //这里是取出云函数环境变量的IP，如果访问的ip和指定ip不一致则不返回内容，一种白名单机制的保护
  let ip = JSON.parse(context.environment).ip;
  if(event.headers['x-real-ip']==ip){
    let html = fs.readFileSync(path.resolve(__dirname, "./admin.html"), {
      encoding: "utf-8",
    });
  
    return {
      isBase64Encoded: false,
      statusCode: 200,
      headers: { "Content-Type": "text/html" },
      body: html,
    };
  }
  else{
    return 404;
  }
};
