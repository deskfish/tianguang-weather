# 天光 · 城市天气对照（网页版）

单页静态站点，零依赖、无需构建。默认对比**北京**与**山东枣庄薛城区**，可横向添加最多 6 座城市。

**线上地址：https://deskfish.github.io/tianguang-weather/**

## 运行

直接双击 `index.html` 即可；或启动静态服务：

```bash
cd weather-compare
python3 -m http.server 4173
# http://127.0.0.1:4173/
```

## 功能

- 顶部实时北京时间（秒级）与日期
- 城市大字对照：气温、天气、体感、今日高低温、空气质量
- 添加 / 移除城市（最多 6 座），支持全国地级市与区县搜索（如 微山县、薛城区），地址栏 `?cities=beijing,xuecheng` 可分享
- 未来 24 小时逐时气温折线，可悬停 / 键盘查看，图例可隐藏城市
- 逐项指标表（14 项）与未来七日预报
- 页面天空配色随北京日照阶段变化
- 10 分钟自动刷新、离线缓存、失败提示
- 响应式：桌面 / 平板 / 手机

## 数据

- 预报与空气质量：[Open-Meteo](https://open-meteo.com/)（CC BY 4.0）
- 城市/区县行政区划与中心坐标：[AreaCity](https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov)（高德地图），仅用于天气查询定位
- 空气质量等级按 PM2.5 折算，仅供参考
- 所有时间均为北京时间（UTC+8）

## 部署

整站是纯静态文件（`index.html` / `styles.css` / `app.js` / `places.js`），无接口密钥、无构建步骤：

- **GitHub Pages**：把本目录推到仓库，Settings → Pages → 选择分支根目录。
- **Vercel / Netlify**：导入目录，Build Command 留空，Output Directory 设为当前目录。
- **对象存储 / Nginx**：上传三个文件，设置 `text/html`、`text/css`、`text/javascript` 即可。

> 页面直连 Open-Meteo，浏览器端无跨域限制；如需国内访问更稳定，可换成自建代理（参考 `../weather-miniprogram/server/proxy.js` 的路由与参数）。

## 小程序版

`../weather-miniprogram/` 是同一套设计的微信小程序原生版本，含云函数代理与上线说明。
