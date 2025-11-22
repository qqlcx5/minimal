// pages/index/index.js
const app = getApp()
function inArray(arr, key, val) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i][key] === val) {
        return i;
      }
    }
    return -1;
  }
Page({

    /**
     * 页面的初始数据
     */
    data: {
        devices: [],
        connected: false,
        chs: [],
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
      wx.getStorage({
        key: 'ships',
        success (res) {
          app.globalData.ships = res.data
          app.globalData.ships.forEach(sp => {
            sp.power = 0;
            sp.rudder = 0;
            sp.ship.latitude = 0;
            sp.ship.longitude = 0;
            sp.points = [];
            sp.waypoints.forEach(item=>{item.selected = false;
            });
          });
          app.globalData.ships[0].ship.iconPath= '../../images/ship0.png',
          app.globalData.ships[1].ship.iconPath= '../../images/ship1.png',
          app.globalData.ships[2].ship.iconPath= '../../images/ship2.png',
          app.globalData.ships[3].ship.iconPath= '../../images/ship3.png',
          app.globalData.ships[4].ship.iconPath= '../../images/ship4.png',
          console.log(res.data)
        }
      })
      wx.getStorage({
        key: 'userAccelerometer',
        success (res) {
          app.globalData.userAccelerometer = res.data
          console.log(res.data)
        }
      })
      wx.getStorage({
        key: 'crossmarker',
        success (res) {
          app.globalData.crossmarker = res.data
          console.log(res.data)
        }
      })
    },
    startBluetoothDevicesDiscovery() {
        if (this._discoveryStarted) {
          return
        }
        this._discoveryStarted = true
        wx.startBluetoothDevicesDiscovery({
          allowDuplicatesKey: true,
          success: (res) => {
            console.log('startBluetoothDevicesDiscovery success', res)
            this.onBluetoothDeviceFound()
          },
        })
    },
    onBluetoothDeviceFound() {
        wx.onBluetoothDeviceFound((res) => {
            res.devices.forEach(device => {
                if (!device.name && !device.localName) {
                return
                }
                const foundDevices = this.data.devices
                const idx = inArray(foundDevices, 'deviceId', device.deviceId)
                const data = {}
                if (idx === -1) {
                data[`devices[${foundDevices.length}]`] = device
                } else {
                data[`devices[${idx}]`] = device
                }
                this.setData(data)
            })
        })
    },
    createBLEConnection(e) {
        const ds = e.currentTarget.dataset
        const deviceId = ds.deviceId
        const name = ds.name
        wx.createBLEConnection({
          deviceId,
          success: (res) => {
            this.setData({
              connected: true,
              name,
              deviceId,
            })
            console.log(e.currentTarget.id )
            console.log(name)
            wx.navigateTo({
                url: '../map/map?connectedDeviceId=' + deviceId + '&connectedDevicename=' + name
              })
          },
          fail:(res)=>{
            console.log(res)
          }
        })
        //wx.stopBluetoothDevicesDiscovery()
    },
    skip(e){
      wx.navigateTo({
        url: '../map/map?connectedDeviceId=' + 0 + '&connectedDevicename=' + 0
      })
    },
    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {
      wx.openBluetoothAdapter({
        success: (res) => {
            console.log('openBluetoothAdapter success', res)
            this.startBluetoothDevicesDiscovery()
        },
        fail: (res) => {
            if (res.errCode === 10001) {
            wx.onBluetoothAdapterStateChange(function (res) {
                console.log('onBluetoothAdapterStateChange', res)
                if (res.available) {
                this.startBluetoothDevicesDiscovery()
                }
            })
            }
        }
    })
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {
        wx.stopBluetoothDevicesDiscovery()
        wx.closeBluetoothAdapter()
    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage: function () {

    }
})