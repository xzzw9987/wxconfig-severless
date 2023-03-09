const Koa = require("koa");
const Router = require("koa-router");
const logger = require("koa-logger");
const bodyParser = require("koa-bodyparser");
const fs = require("fs");
const path = require("path");
const { init: initDB, Counter } = require("./db");

const router = new Router();

const homePage = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");

// 首页
router.get("/", async (ctx) => {
  ctx.body = homePage;
});

// 更新计数
router.post("/api/count", async (ctx) => {
  const { request } = ctx;
  const { action } = request.body;
  if (action === "inc") {
    await Counter.create();
  } else if (action === "clear") {
    await Counter.destroy({
      truncate: true,
    });
  }

  ctx.body = {
    code: 0,
    data: await Counter.count(),
  };
});

// 获取计数
router.get("/api/count", async (ctx) => {
  const result = await Counter.count();

  ctx.body = {
    code: 0,
    data: result,
  };
});

// 小程序调用，获取微信 Open ID
router.get("/api/wx_openid", async (ctx) => {
  if (ctx.request.headers["x-wx-source"]) {
    ctx.body = ctx.request.headers["x-wx-openid"];
  }
});

var appid = 'wx875779ce30627de4'
var secret = processArgs['secret']

// wx875779ce30627de4
// 23d2c4a39ae964cccf54979a96c6de24
var accessToken
var jsApiTicket
var timestamp

console.log(appid, secret)

function getAccessToken () {
  https.get({
    hostname: 'api.weixin.qq.com',
    path: '/cgi-bin/token?grant_type=client_credential&appid=' + appid + '&secret=' + secret
  }, function (res) {
    var d = ''
    res.setEncoding('utf8')
    res.on('data', function (data) {
      d += data
    })
    res.on('end', function () {
      d = JSON.parse(d)
      accessToken = d['access_token']
      if (accessToken)
        getJSAPITicket()
    })
  })
  setTimeout(getAccessToken, 7200 * 1000)
}

function getJSAPITicket () {
  // https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=ACCESS_TOKEN&type=jsapi
  https.get({
      hostname: 'api.weixin.qq.com',
      path: '/cgi-bin/ticket/getticket?type=jsapi'
    },
    function (res) {
      var d = ''
      res.setEncoding('utf8')
      res.on('data', function (data) {
        d += data
      })
      res.on('end', function () {
        d = JSON.parse(d)
        jsApiTicket = d['ticket']
      })
    }
  )

}

function getSignature (url) {
  if (!jsApiTicket)
    return
  timestamp = parseInt(('' + (new Date).getTime()).substring(0, 10), 10)
  console.log(
    'jsapi_ticket=' + jsApiTicket +
    '&noncestr=' + nonceStr +
    '&timestamp=' + timestamp +
    '&url=' + url
  )
  return crypto.createHash('sha1')
    .update(
      'jsapi_ticket=' + jsApiTicket +
      '&noncestr=' + nonceStr +
      '&timestamp=' + timestamp +
      '&url=' + url
    )
    .digest('hex')
}

router.get('/wx_config', async (ctx, next) => {
  const {url} = ctx.query
  var sig = getSignature(url)
  const content =
    'wx.config({' +
    'debug: false, ' +
    'appId: \'' + appid + '\',' +
    'timestamp: \'' + timestamp + '\',' +
    'nonceStr: \'' + nonceStr + '\',' +
    'signature: \'' + sig + '\',' +
    'jsApiList: [\'onMenuShareTimeline\',\'onMenuShareAppMessage\']' +
    '})'
  ctx.response.headers['content-type'] = 'application/javascript; charset=utf-8'
  ctx.body = content;
})


const app = new Koa();
app
  .use(logger())
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

const port = process.env.PORT || 80;
async function bootstrap() {
  getJSAPITicket()
  await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}
bootstrap();
