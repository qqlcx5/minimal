// app.js
App({
  globalData:{
    bleserviceuuid: ["0000FFE0-0000-1000-8000-00805F9B34FB", "00001000-0000-1000-8000-00805F9B34FB"  ],
    bletxuuid: ["0000FFE1-0000-1000-8000-00805F9B34FB", "00001001-0000-1000-8000-00805F9B34FB"  ],
    Observe :false,
    userAccelerometer : false,
    crossmarker:[{
      id: 99999,
      width:25,
      height:25,
      anchor:{x:0.5 , y:0.5},
      latitude:  24.5945,
      longitude: 118.0835,
      iconPath: '../../images/cross.png',
      zindex:0,
      mapscale:10,
  }],
    ships:[
      {//0
          power:0,
          rudder:0,
          waypoints:[],
          points:[],
          ship:{
            id: 99998,
            width:30,
            height:30,
            anchor:{x:0.5 , y:0.5},
            latitude:  24.5945,
            longitude: 118.0835,
            rotate:90,
            iconPath: '../../images/ship0.png',
          },
          plos: {
              id: 99997,
              width:10,
              height:10,
              anchor:{x:0.5 , y:1},
              latitude:  24.5945,
              longitude: 118.0835,
              rotate:0,
              iconPath: '../../images/plosmark.png',
            },
      },
      {//1
        power:0,
        rudder:0,
        waypoints:[],
        points:[],
        ship:{
          id: 99996,
          width:30,
          height:30,
          anchor:{x:0.5 , y:0.5},
          latitude:  0,
          longitude: 0,
          rotate:90,
          iconPath: '../../images/ship1.png',
        },
        plos: {
            id: 99995,
            width:10,
            height:10,
            anchor:{x:0.5 , y:1},
            latitude:  0,
            longitude: 0,
            rotate:0,
            iconPath: '../../images/plosmark.png',
          },
      },
      {//2
        power:0,
        rudder:0,
        waypoints:[],
        points:[],
        ship:{
          id: 99994,
          width:30,
          height:30,
          anchor:{x:0.5 , y:0.5},
          latitude:  0,
          longitude: 0,
          rotate:90,
          iconPath: '../../images/ship2.png',
        },
        plos: {
            id: 99993,
            width:10,
            height:10,
            anchor:{x:0.5 , y:1},
            latitude:  0,
            longitude: 0,
            rotate:0,
            iconPath: '../../images/plosmark.png',
          },
      },
      {//3
        power:0,
        rudder:0,
        waypoints:[],
        points:[],
        ship:{
          id: 99991,
          width:30,
          height:30,
          anchor:{x:0.5 , y:0.5},
          latitude:  0,
          longitude: 0,
          rotate:90,
          iconPath: '../../images/ship3.png',
        },
        plos: {
            id: 99991,
            width:10,
            height:10,
            anchor:{x:0.5 , y:1},
            latitude:  0,
            longitude: 0,
            rotate:0,
            iconPath: '../../images/plosmark.png',
          },
        },
        {//4
          power:0,
          rudder:0,
          waypoints:[],
          points:[],
          ship:{
            id: 99990,
            width:30,
            height:30,
            anchor:{x:0.5 , y:0.5},
            latitude:  0,
            longitude: 0,
            rotate:90,
            iconPath: '../../images/ship4.png',
          },
          plos: {
              id: 99989,
              width:10,
              height:10,
              anchor:{x:0.5 , y:1},
              latitude:  0,
              longitude: 0,
              rotate:0,
              iconPath: '../../images/plosmark.png',
            },
        },
    ]
  },
  onLaunch: function () {
    wx.setKeepScreenOn({
      　　keepScreenOn: true,
      })
    // 小程序自动更新
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      updateManager.onCheckForUpdate(function (res) {
        // 请求完新版本信息的回调
        if (res.hasUpdate) {
          updateManager.onUpdateReady(function () {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: function (res) {
                if (res.confirm) {
                  // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
                  updateManager.applyUpdate()
                }
              }
            })
          })
          updateManager.onUpdateFailed(function () {
            // 新的版本下载失败
            wx.showModal({
              title: '已经有新版本了哟~',
              content: '新版本已经上线，请您删除当前小程序，重新搜索打开'
            })
          })
        }
      })
    }
    if (!wx.cloud) {
      //console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      // wx.cloud.init({
      //   // env 参数说明：
      //   //   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
      //   //   此处请填入环境 ID, 环境 ID 可打开云控制台查看
      //   //   如不填则使用默认环境（第一个创建的环境）
      //   // env: 'my-env-id',
      //   traceUser: true,
      // });
    }
  }
});
