/*
京喜现金签到
已支持IOS双京东账号,Node.js支持N个京东账号
脚本兼容: QuantumultX, Surge, Loon, JSBox, Node.js
============Quantumultx===============
[task_local]
#京喜现金签到
10 9 * * * https://raw.githubusercontent.com/lxk0301/jd_scripts/master/jx_sign.js, tag=京喜现金签到, enabled=true

================Loon==============
[Script]
cron "5 0 * * *" script-path=https://raw.githubusercontent.com/lxk0301/jd_scripts/master/jx_sign.js,tag=京喜现金签到

===============Surge=================
京喜现金签到 = type=cron,cronexp="5 0 * * *",wake-system=1,timeout=20,script-path=https://raw.githubusercontent.com/lxk0301/jd_scripts/master/jx_sign.js

============小火箭=========
京喜现金签到 = type=cron,script-path=https://raw.githubusercontent.com/lxk0301/jd_scripts/master/jx_sign.js, cronexpr="5 0 * * *",timeout=200, enable=true
*/
const $ = new Env('京喜签到消消乐');
const notify = $.isNode() ? require('./sendNotify') : '';
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
let jdNotify = true;//是否关闭通知，false打开通知推送，true关闭通知推送
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '', message;
let helpAuthor = true
if ($.isNode()) {
  Object.keys(jdCookieNode).forEach((item) => {
    cookiesArr.push(jdCookieNode[item])
  })
  if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};
} else {
  cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}
const JD_API_HOST = 'https://wq.jd.com/';

$.info = {};
$.health = 0;
$.pass_level = 0;
$.help_step = 0;
$.smps=[];
$.help_friends=[];
$.help_num = 0;

!(async () => {
  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});
    return;
  }
  $.newShareCodes = []

  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      await signhb();
      await queryuserinfo();
      await $.wait(1000)
      await queryuserinfo(true);
      for (let h = 0; h < $.help_friends.length; h++) {
        if ($.smp === $.help_friends[h] || $.break) {
          continue;
        }
        await helpfriend($.help_friends[h]);
        await $.wait(1000)
      }
    }
  }
  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
      $.index = i + 1;
      $.isLogin = true;
      $.nickName = '';
      message = '';
      $.help_friend = '';
      $.smp='';
      $.commonlist=[];
      $.break = false;
      await TotalBean();
      console.log(`\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
      if (!$.isLogin) {
        $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, {"open-url": "https://bean.m.jd.com/bean/signIndex.action"});

        if ($.isNode()) {
          await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
        }
        continue
      }
      await signhb(true);
      await queryuserinfo(true);

      for (let h = 0; h < $.smps.length; h++) {
        if ($.smp === $.smps[h]) {
          $.help_num--
          continue;
        }
        await helpSignhb($.smps[h]);
        await $.wait(500);
        $.help_num++;
        break
      }
      if ($.help_num === 3) {
        $.smps.shift()
        $.help_num = 0;
      }
      await $.wait(1000);

      for (let h = 0; h < $.commonlist.length; h++) {
        await dotask($.commonlist[h]);
        await $.wait(5000)
      }
      if ($.break) {
        continue;
      }
      await $.wait(500);
      await queryuserinfo(true);
      await jdCash()
      await $.wait(500);

    }
  }

})()
    .catch((e) => {
      $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
      $.done();
    })

async function jdCash() {
  await queryuserinfo(true);
  for (let j = $.pass_level; j <= $.help_step; j++) {
    for (let k = 1; k >= 0; k--) {
      if ($.pass_level < 5 && $.health > 0){
        await endgame(k === 1 ? 'false': 'true', j + 1, k);
      }
      await $.wait(5000)
    }
    await $.wait(5000)
  }
  await queryuserinfo(true);
  await $.wait(1000);
  if ($.pass_level === 5) {
    await drawprize();
  }
}

function signhb(is_me = false) {
  return new Promise((resolve) => {
    // g_tk=1030661760
    // console.log(taskUrl("fanxiantask/signhb/query"))
    $.get(taskUrl("fanxiantask/signhb/query"), async (err, resp, data) => {
      try {
        data = JSON.parse(data.match(new RegExp(/jsonpCBK.?\((.*);*/))[1]);
        // console.log(data)
        const {smp, commontask, sharetask:{ status}} = data;
        $.commonlist = [];
        // console.log(commontask)
        if (smp != '') {
          if (is_me) {
            $.smp = smp;
            for (let i = 0; i < commontask.length; i++) {
              if(commontask[i]['task'] && commontask[i]['status'] != 2) {
                $.commonlist.push(commontask[i]['task']);
              }
            }
            if ($.commonlist.length > 0) {
              $.commonlist.push('qdtx')
            }
          } else {
            if(status === 1){
              $.smps.push(smp);
            }
          }
        } else {
          $.smp = '';
        }
        // data = JSON.parse(data);
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {

        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}
function helpSignhb(smp) {
  return new Promise((resolve) => {
    // g_tk=1030661760
    // console.log(taskUrl("fanxiantask/signhb/query", `type=1&signhb_source=1000&smp=${smp}`))
    $.get(taskUrl("fanxiantask/signhb/query", `type=1&signhb_source=1000&smp=${smp}`), async (err, resp, data) => {
      try {
        data = JSON.parse(data.match(new RegExp(/jsonpCBK.?\((.*);*/))[1]);
        // const {smp,commonlist} = data;
        // $.smps.push(smp);
        // $.commonlist = commonlist;
        // data = JSON.parse(data);
        // console.log(data);
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {

        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}
function dotask(task) {
  return new Promise((resolve) => {
    // g_tk=1030661760
    $.get(taskUrl("fanxiantask/signhb/dotask", `task=${task}&signhb_source=1000&smp=`), async (err, resp, data) => {
      try {
        data = JSON.parse(data.match(new RegExp(/jsonpCBK.?\((.*);*/))[1]);
        // data = JSON.parse(data);
        // console.log(data);
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if(data.ret == 0) {
            console.log(`完成任务 获得 ${data.sendhb} 红包`)
          }else {
            console.log(data.errmsg)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}

function endgame(ispaas, passlevel, type) {
  return new Promise((resolve) => {
    // console.log(taskUrl("fanxianzl/xiaoxiaole/endgame", `ispaas=${ispaas}&passlevel=${passlevel}&gamedata=&type=${type}`))
    $.get(taskUrl("fanxianzl/xiaoxiaole/endgame", `ispaas=${ispaas}&passlevel=${passlevel}&gamedata=&type=${type}`), async (err, resp, data) => {
      try {
        const Rex = /\{.*\}/;
        data = data.match(Rex);
        data = JSON.parse(data);
        // console.log(data);
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data.ret === 0) {
            if (data.data) {
              console.log(`上报成功，获得${data.data.prize.discount}红包`)
            } else {
              console.log(`开始关卡 成功，请等待`)
            }
          } else if(data.ret === 1820){
            console.log(`没体力`)
          }else {
            console.log(data)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}

function helpfriend(shareid) {
  return new Promise((resolve) => {
    // g_tk=1030661760
    // console.log(taskUrl("fanxianzl/xiaoxiaole/helpfriend", `shareid=${shareid}&helptype=2&ver=1`))
    $.get(taskUrl("fanxianzl/xiaoxiaole/helpfriend", `shareid=${shareid}&helptype=2&ver=1`), async (err, resp, data) => {
      try {
        const Rex = /\{.*\}/;
        data = data.match(Rex);
        data = JSON.parse(data);
        // console.log(data);
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data.ret == 0) {
            if (data.data) {
              console.log(`${data.msg}`)
            }
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}
function queryuserinfo(is_me = false) {
  return new Promise((resolve) => {
    // console.log(taskUrl("fanxianzl/xiaoxiaole/queryuserinfo", `ver=1`))
    $.get(taskUrl("fanxianzl/xiaoxiaole/queryuserinfo", `ver=1`), async (err, resp, data) => {
      try {
        const Rex = /\{.*\}/;
        data = data.match(Rex);
        // console.log(JSON.parse(data))
        const {msg, ret} = JSON.parse(data);
        // console.log(msg);
        // console.log(help_list);
        if (ret == 147){
          $.break = true;
          console.log('活动已黑')
        }else{
          const {msg, ret, data: { health, hb_list = {}, pass_level, help_step, help_list,shareid } = {} } = JSON.parse(data);
          if (shareid) {
            if (is_me) {
              $.help_friend = shareid;
              $.health = health;
              $.pass_level = pass_level;
              $.help_step = help_step;
            } else {
              $.help_friends.push(shareid);
            }
          }
          $.break = false;
        }


      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}

function drawprize() {
  return new Promise((resolve) => {
    $.get(taskUrl("fanxianzl/xiaoxiaole/drawprize"), async (err, resp, data) => {
      try {
        const Rex = /\{.*\}/;
        data = data.match(Rex);
        data = JSON.parse(data);
        console.log(data);
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          console.log(data);
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve(data);
      }
    })
  })
}

function showMsg() {
  message+=`本次运行获得金币${$.coins},现金${$.money}`
  return new Promise(resolve => {
    if (!jdNotify) {
      $.msg($.name, '', `${message}`);
    } else {
      $.log(`京东账号${$.index}${$.nickName}\n${message}`);
    }
    resolve()
  })
}
function taskUrl(functionId, body = '') {
  return {
    url: `${JD_API_HOST}${functionId}?${body ? body + '&' : ''}_=${Date.now()}&sceneval=2&g_login_type=1&callback=jsonpCBKC&g_ty=ls`,
    headers: {
      'Cookie': cookie,
      'Host': 'wq.jd.com',
      'sec-fetch-mode': 'no-cors',
      'user-agent': 'jdpingou;android;4.4.0;9;f96efb0a034e5197;network/wifi;model/MIX 2;appBuild/15920;partner/xiaomi;;session/5;aid/f96efb0a034e5197;oaid/332b10c3a1a0ea7c;pap/JA2019_3111789;brand/Xiaomi;eu/6693635666260316;fv/0333435653139373;Mozilla/5.0 (Linux; Android 9; MIX 2 Build/PKQ1.190118.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/74.0.3729.136 Mobile Safari/537.36',
      'accept': '*/*',
      'x-requested-with': 'com.jd.pingou',
      'sec-fetch-site': 'same-site',
      'referer': 'https://wqs.jd.com/sns/202102/05/eliminate/index.html',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    }
  }
}

function TotalBean() {
  return new Promise(async resolve => {
    const options = {
      "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
      "headers": {
        "Accept": "application/json,text/plain, */*",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "zh-cn",
        "Connection": "keep-alive",
        "Cookie": cookie,
        "Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2",
        "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.2.2;14.2;%E4%BA%AC%E4%B8%9C/9.2.2 CFNetwork/1206 Darwin/20.1.0")
      }
    }
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          console.log(`${JSON.stringify(err)}`)
          console.log(`${$.name} API请求失败，请检查网路重试`)
        } else {
          if (data) {
            data = JSON.parse(data);
            if (data['retcode'] === 13) {
              $.isLogin = false; //cookie过期
              return
            }
            if (data['retcode'] === 0) {
              $.nickName = (data['base'] && data['base'].nickname) || $.UserName;
            } else {
              $.nickName = $.UserName
            }
          } else {
            console.log(`京东服务器返回空数据`)
          }
        }
      } catch (e) {
        $.logErr(e, resp)
      } finally {
        resolve();
      }
    })
  })
}

function jsonParse(str) {
  if (typeof str == "string") {
    try {
      return JSON.parse(str);
    } catch (e) {
      console.log(e);
      $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
      return [];
    }
  }
}
// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}


