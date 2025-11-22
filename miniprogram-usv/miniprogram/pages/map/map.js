// map.js
const app = getApp()
const {
  envList
} = require('../../envList.js');
var JWDutils = require('../../utils/WScoordinate.js');
var stm32 = require('../../utils/STM32Com.js');
var crcCal = require('../../utils/crcCalc.js');
var RxTimeOut = 0;
var shipid = 0;
var Timeout = 0;
var rudderdragtime = 0;
Page({
  data: {
    EnableAuto:false,
    mapscale:10,
    userAccelerometer: true,
    ShowSettings: false,
    CMD25_Data2Power: 0,
    SpeedKnot: 0,
    CMD23_Data2BatteryVoltage: 0,
    CMD27_Data6SingleMin: 0,
    connectedDeviceId: '',
    connectedDevicename: '',
    theme: 'light',
    powerbuttoncolor: "#757575",
    rudderbuttoncolor: "#757575",
    CurRudder: 0,
    UserSetPower: 0,
    powerslidervalue: 60,
    rudderslidervalue: 60,
    enabled: true,
    LocalOK: false,
    RemoteOK: false,
    USVOnline: false,
    RxCount: 0,
    markers: [],
    polyline: [{
        points: [],
        color: '#ff7043',
        width: 1
      },
      {
        points: [],
        color: '#3875FF',
        width: 1
      }
    ],
  },
  startInter: function () {
    const that = this
    this.interval = setInterval(
      function () {
        rudderdragtime ++ ;
        if (RxTimeOut < 0 || RxTimeOut > 20) {
          console.log('RxTimeOut:' + RxTimeOut)
          that.writeBLECharacteristicValue();
          RxTimeOut = 1;
        }
        RxTimeOut++;
      }, 50);
  },
  onReady() {
    const that = this
    wx.onAccelerometerChange(function (res) {
      var result = 0
      var value = res.y * 100

      if (value < -15 || value > 15) {
        result = value;
      }
      if (result < 0)
        result = result + 15;
      else if (result > 0)
        result = result - 15;
      result = -(result * 3).toFixed(0)
      if (app.globalData.userAccelerometer && stm32.GetEnableManual(shipid)) {
        if (result == 0 || app.globalData.ships[shipid].rudder - result > 2 || app.globalData.ships[shipid].rudder - result < -2) {
          app.globalData.ships[shipid].rudder = result;
          that.setData({
            CurRudder: result
          })
        }
      }
    }) 
    console.log(this.data.connectedDeviceId)
    this.getBLEDeviceServices(this.data.connectedDeviceId)
    this.startInter()
  },
  getBLEDeviceServices(deviceId) {
    console.log(deviceId)
    wx.getBLEDeviceServices({
      deviceId,
      fail:(res)=>{

      },
      success: (res) => {
        console.log('getBLEDeviceServices success')
        for (let i = 0; i < res.services.length; i++) {
          console.log(res.services[i].uuid);
          if (app.globalData.bleserviceuuid.indexOf(res.services[i].uuid) >= 0) 
          {
            this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid)
            return
          }
        }
      }
    })
  },
  getBLEDeviceCharacteristics(deviceId, serviceId) {
    console.log(deviceId)
    console.log(serviceId)
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        console.log('getBLEDeviceCharacteristics success', res.characteristics)
        Timeout = 0;
        for (let i = 0; i < res.characteristics.length; i++) {
          let item = res.characteristics[i]
          if (item.properties.read) {
            wx.readBLECharacteristicValue({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
            })
          }
          //if (item.properties.writeNoResponse) 
          if (app.globalData.bletxuuid.indexOf(item.uuid) >= 0) 
          {
            this._deviceId = deviceId
            this._serviceId = serviceId
            this._characteristicId = item.uuid
            this.writeBLECharacteristicValue()
          }
          if (item.properties.notify || item.properties.indicate) {
            wx.notifyBLECharacteristicValueChange({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
              state: true,
            })
          }
        }
        for(let i = 0; i < app.globalData.ships.length; i++)
        {
          stm32.StartUpdateWayPoint(i);
          for (let j = 0; j < app.globalData.ships[i].waypoints.length; j++) {
            stm32.UpdateWayPoint(i, app.globalData.ships[i].waypoints[j].id, app.globalData.ships[i].waypoints[j].longitude, app.globalData.ships[i].waypoints[j].latitude)
          }
          stm32.EndUpdateWayPoint(i);
        }
      },
      fail(res) {
        console.error('getBLEDeviceCharacteristics', res)
      }
    })
    this.onBLEDateReceiverd();
  },
  //蓝牙发送数据
  writeBLECharacteristicValue() {
    var arr = stm32.GetTxBuf(shipid, this.data.UserSetPower, -app.globalData.ships[shipid].rudder)
    const that = this
    wx.writeBLECharacteristicValue({
      deviceId: this._deviceId,
      serviceId: this._serviceId,
      characteristicId: this._characteristicId,
      value: new Uint8Array(arr).buffer,
      fail(res) {
        Timeout = Timeout + 1;
        if(Timeout > 1)
        {
          that.reconnectBLE();
        }
        wx.showToast({
          title: '发送失败',
        })
      },
      success(res)
      {
        Timeout = 0;
      },
    })
  },
  reconnectBLE()
  {
    const that = this;
    wx.createBLEConnection({
      deviceId: that._deviceId,
      success: (res) => {
        that.getBLEDeviceServices(that.data.connectedDeviceId)
      },
      fail:(res)=>{
        console.log(res)
      }
    })
  },
  //蓝牙接收数据
  onBLEDateReceiverd() {
    var that = this
    wx.onBLECharacteristicValueChange((characteristic) => {
      if (characteristic.value.byteLength < 5)
        return;
      const view = new DataView(characteristic.value);
      var arr = []
      for (var i = 0; i < view.byteLength - 2; i++)
        arr.push(view.getInt8(i))
      var calc_crc = crcCal.compute(arr, arr.length)
      var rec_crc = view.getInt16(view.byteLength - 2, false) & 0xffff
      if (calc_crc != rec_crc)
        return;
      var id = view.getUint8(0);
      if(id == shipid)
      {
        that.setData({
          LocalOK: (view.getInt8(2) & 0x02) == 0 ? false : true,
          RemoteOK: (view.getInt8(2) & 0x04) == 0 ? false : true,
          USVOnline: (view.getInt8(2) & 0x08) == 0 ? false : true,
        });
      }
      switch (view.getUint8(1)) {//功能码
        case 0:
          var lat = view.getInt32(6, true) / 1000000.0;
          var lng = view.getInt32(10, true) / 1000000.0;
          let result = JWDutils.wgs84ToGcj02(lng, lat)
          var point = [{
            latitude: result[1],
            longitude: result[0]
          }];
          if(app.globalData.ships[id].points.length == 0 || stm32.GetRealDistance(result[0], result[1], app.globalData.ships[id].points[app.globalData.ships[id].points.length - 1].longitude,app.globalData.ships[id].points[app.globalData.ships[id].points.length - 1].latitude) > 8 )
          {
            app.globalData.ships[id].points = app.globalData.ships[id].points.concat(point);
          }
          if (app.globalData.ships[id].points > 500)
            app.globalData.ships[id].points = app.globalData.ships[id].points.slice(1, app.globalData.ships[id].points.length);
          app.globalData.ships[id].ship.rotate = view.getInt16(4, true) / 10.0;
          app.globalData.ships[id].ship.longitude = result[0];
          app.globalData.ships[id].ship.latitude = result[1];
          this.updateships();
          break;
        case 1:
          var lat = view.getInt32(14, true) / 1000000.0;
          var lng = view.getInt32(10, true) / 1000000.0;
          result = JWDutils.wgs84ToGcj02(lng, lat)
          if(id == shipid)
          {
            that.setData({
              'markers[6].longitude': result[0],//plos
              'markers[6].latitude': result[1],
              CMD23_Data2BatteryVoltage: (view.getInt16(8, true) / 10.0).toFixed(1),
            });
          }
          break;
        case 2:
          var lat = view.getInt32(14, true) / 1000000.0;
          var lng = view.getInt32(10, true) / 1000000.0;
          result = JWDutils.wgs84ToGcj02(lng, lat)
          if(id == shipid)
          {
            that.setData({
              'markers[6].longitude': result[0],//plos
              'markers[6].latitude': result[1],
              CMD25_Data2Power: view.getInt16(8, true),
            });
          }
          break;
        case 3:
          var lat = view.getInt32(14, true) / 1000000.0;
          var lng = view.getInt32(10, true) / 1000000.0;
          result = JWDutils.wgs84ToGcj02(lng, lat)
          if(id == shipid)
          {
            that.setData({
              'markers[6].longitude': result[0],//plos
              'markers[6].latitude': result[1],
              SpeedKnot: (view.getInt16(4, true) / 10.0).toFixed(1),
              CMD27_Data6SingleMin: view.getInt16(8, true),
            });
          }
          break;
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10:
        case 11:
          stm32.RemoveInstruction(id, view.getInt8(1), view.getInt16(4))
          break;
        case 0xff:
          app.globalData.Observe = true;
          stm32.ClearInstructions();
          switch (view.getUint8(2))
          {
            case 5:
              this.startUpdateWayPoint();
              break;
            case 6:
              let lng = view.getInt32(7) / 1000000.0;
              let lat = view.getInt32(11) / 1000000.0;
              let result = JWDutils.wgs84ToGcj02(lng, lat)
              this.updateWayPoint(view.getInt16(5), result[0], result[1]);
              break;
            case 7:
              this.endUpdateWayPoint();
              break;
        }
          break;
        default:
          break;
      }
      RxTimeOut = 20;
      var rxc = that.data.RxCount + 1;
      that.setData({
        'RxCount': rxc,
      })
      if(id == shipid && rudderdragtime > 20)
      {
        that.setData({
          CurRudder:  view.getInt8(3) ,  
        });
      }
    })
  },
  updateships(){
    var that = this
    that.setData({
      'markers[1].rotate': app.globalData.ships[0].ship.rotate,
      'markers[1].longitude':  app.globalData.ships[0].ship.longitude,
      'markers[1].latitude': app.globalData.ships[0].ship.latitude,
      'markers[2].rotate': app.globalData.ships[1].ship.rotate,
      'markers[2].longitude':  app.globalData.ships[1].ship.longitude,
      'markers[2].latitude': app.globalData.ships[1].ship.latitude,
      'markers[3].rotate': app.globalData.ships[2].ship.rotate,
      'markers[3].longitude':  app.globalData.ships[2].ship.longitude,
      'markers[3].latitude': app.globalData.ships[2].ship.latitude,
      'markers[4].rotate': app.globalData.ships[3].ship.rotate,
      'markers[4].longitude':  app.globalData.ships[3].ship.longitude,
      'markers[4].latitude': app.globalData.ships[3].ship.latitude,
      'markers[5].rotate': app.globalData.ships[4].ship.rotate,
      'markers[5].longitude':  app.globalData.ships[4].ship.longitude,
      'markers[5].latitude': app.globalData.ships[4].ship.latitude,
      'polyline[1].points':app.globalData.ships[shipid].points,
    });
  },
  updatewaypoints(){
    var that = this
    that.setData({
      'markers': app.globalData.crossmarker.concat(app.globalData.ships[0].ship).concat(app.globalData.ships[1].ship).concat(app.globalData.ships[2].ship).concat(app.globalData.ships[3].ship).concat(app.globalData.ships[4].ship).concat(app.globalData.ships[shipid].plos).concat(app.globalData.ships[shipid].waypoints),
      'polyline[0].points': app.globalData.ships[shipid].waypoints,
    });
  },
  //页面卸载
  onUnload() {
    clearInterval(this.interval)
    wx.stopBluetoothDevicesDiscovery()
    wx.closeBLEConnection({
      deviceId: this.data.connectedDeviceId
    })
    wx.closeBluetoothAdapter()
  },
  //页面加载
  onLoad: function (options) {
    var that = this
    that.setData({
      'userAccelerometer': app.globalData.userAccelerometer,
      'connectedDevicename': options.connectedDevicename,
      'connectedDeviceId': options.connectedDeviceId,
      'mapscale':app.globalData.crossmarker[0].mapscale,
    })
    this.updatewaypoints();
    const mapCtx = wx.createMapContext('mapId', this);
    mapCtx.moveToLocation({
      latitude: app.globalData.crossmarker[0].latitude,
      longitude: app.globalData.crossmarker[0].longitude,
    });
  },
  onPowerDrag(event) {
    const that = this
    var result = 0
    var color = "#757575"
    var value = 60 - event.detail.value
    if (value < -10 || value > 10) {
      result = value;
    }
    if (result < 0) {
      result = result + 10;
      color = "#ff7043"
    } else if (result > 0) {
      result = result - 10;
      color = "#00b26a"
    }
    app.globalData.ships[shipid].power = (result * 2).toFixed(0);
    that.setData({
      UserSetPower: app.globalData.ships[shipid].power,
      powerslidervalue: event.detail.value,
      powerbuttoncolor: color
    })
  },
  onRudderDrag(event) {
    rudderdragtime = 0;
    if (app.globalData.userAccelerometer || !stm32.GetEnableManual(shipid))
       return;
    const that = this
    var result = 0
    var color = "#757575"
    var value = 60 - event.detail.value
    if (value < -10 || value > 10) {
      result = value;
    }
    if (result < 0) {
      result = result + 10;
      color = "#ff7043"
    } else if (result > 0) {
      result = result - 10;
      color = "#ff7043"
    }
    app.globalData.ships[shipid].rudder = (-result * 2).toFixed(0);
    that.setData({
      rudderslidervalue: event.detail.value,
      CurRudder: app.globalData.ships[shipid].rudder,
      rudderbuttoncolor: color
    })
  },
  //自动
  autoChange(e) {
    //EnableManual = !e.detail.value;
    stm32.SetEnableManual(shipid, !e.detail.value);
  },
  //使用加速度计
  userAccelerometerChange(e) {
    var that = this
    app.globalData.userAccelerometer = e.detail.value;
    wx.setStorage({
      key: "userAccelerometer",
      data: app.globalData.userAccelerometer
    });
    that.setData({
      'userAccelerometer': app.globalData.userAccelerometer,
    });
  },
  //设定舵机零点
  forceSetZPoint(e) {
    stm32.SetForceSetZPoint(shipid);
  },
  //设定舵机零点
  calibINS(e) {
    stm32.SetCalibINS(shipid);
  },
  startUpdateWayPoint()
  {
    app.globalData.ships[shipid].waypoints.forEach(element => {
      element.updated = false;
    });
  },
  updateWayPoint(id, lng, lat)
  {
    let ok = false;
    app.globalData.ships[shipid].waypoints.forEach(item => {
      if (item.id == id) {
        ok = true;
        item.latitude = lat;
        item.longitude = lng;
        this.updatewaypoints();
      }
    });
    if(!ok)
    {
      var point = [{
        id: id,
        anchor: {
          x: 0.5,
          y: 1
        },
        iconPath: '../../images/reddotmark.png',
        width: 20,
        height: 20,
        latitude: lat,
        longitude: lng,
        selected: false,
        updated: true
      }];
      for(let i = 0; i<app.globalData.ships[shipid].waypoints.length; i++)
      {
          if(!app.globalData.ships[shipid].waypoints[i].updated)
          {
              app.globalData.ships[shipid].waypoints.splice(i, 0, point);
              ok = true;
              break;
          }
      }
      if(!ok)
      {
        app.globalData.ships[shipid].waypoints.splice(app.globalData.ships[shipid].waypoints.length, 0, point);
      }  
    }
  },
  endUpdateWayPoint()
  {
    var that = this;
    for(let i = 0; i< app.globalData.ships[shipid].waypoints.length; i++)
    {
        if(!app.globalData.ships[shipid].waypoints[i].updated)
        {
          app.globalData.ships[shipid].waypoints.splice(i, 1);
        }
    }
    this.updatewaypoints();
  },
  //添加新标记点
  addWayPoint() {
    var that = this
    console.log('addWayPoint')
    const mapCtx = wx.createMapContext('mapId', this);
    mapCtx.getCenterLocation({
      success: res => {
        let id = 0
        if (app.globalData.ships[shipid].waypoints.length > 0)
          id = app.globalData.ships[shipid].waypoints[app.globalData.ships[shipid].waypoints.length - 1].id + 1
        var point = [{
          id: id,
          anchor: {
            x: 0.5,
            y: 1
          },
          iconPath: '../../images/reddotmark.png',
          width: 20,
          height: 20,
          latitude: res.latitude,
          longitude: res.longitude,
          selected: false,
          updated:false
        }];
        app.globalData.ships[shipid].waypoints = app.globalData.ships[shipid].waypoints.concat(point);
        this.updatewaypoints();
        stm32.AddWayPoint(shipid, id, res.longitude, res.latitude)
        wx.setStorage({key: "ships", data: app.globalData.ships});
      }
    });
  },
  //删除选中标记点
  deleteAllWayPoint() {
    var that = this
    console.log('deleteAllWayPoint')
    stm32.DeleteAllWayPoint(shipid)
    app.globalData.ships[shipid].waypoints = []
    wx.setStorage({key: "ships", data: app.globalData.ships});
    this.updatewaypoints();
  },
  //删除选中标记点
  deleteWayPoint() {
    var that = this
    console.log('deleteWayPoint')
    for (let i = 0; i < app.globalData.ships[shipid].waypoints.length; i++) {
      if (app.globalData.ships[shipid].waypoints[i].selected) {
        stm32.DeleteWayPoint(shipid, app.globalData.ships[shipid].waypoints[i].id)
        app.globalData.ships[shipid].waypoints.splice(i, 1)
        wx.setStorage({key: "ships", data: app.globalData.ships});
        this.updatewaypoints();
      }
    }
  },
  //显示设置
  showsettings() {
    var that = this
    let s = !that.data.ShowSettings;
    that.setData({
      'ShowSettings': s,
    });
  },
  onMapTap() {
    console.log('onMapTap')
    var that = this
    let sel = false;
    app.globalData.ships[shipid].waypoints.forEach(item => {
      if (item.selected)
        sel = true
      item.width = 20;
      item.height = 20;
      item.selected = false;
    });
    app.globalData.ships.forEach(sp => {
      sp.ship.width = 30;
      sp.ship.height = 30;
    });
    app.globalData.ships[shipid].ship.width = 45;
    app.globalData.ships[shipid].ship.height = 45;
    sel = true;
    if (sel) {
      that.setData({
        CurRudder: app.globalData.ships[shipid].rudder,
        UserSetPower: app.globalData.ships[shipid].power,
        'markers': app.globalData.crossmarker.concat(app.globalData.ships[0].ship).concat(app.globalData.ships[1].ship).concat(app.globalData.ships[2].ship).concat(app.globalData.ships[3].ship).concat(app.globalData.ships[4].ship).concat(app.globalData.ships[shipid].plos).concat(app.globalData.ships[shipid].waypoints),
      });
    }
    that.setData({
      EnableAuto: !stm32.GetEnableManual(shipid),
    });
  },
  //标记点选中
  onMarkerTap(e) {
    console.log('onMarkerTap')
    var that = this
    app.globalData.ships[shipid].waypoints.forEach(item => {
      item.width = 20;
      item.height = 20;
      item.selected = false;
      if (e.markerId == item.id) {
        item.width = 25;
        item.height = 25;
        item.selected = true;
        const mapCtx = wx.createMapContext('mapId', this);
        mapCtx.moveToLocation({
          latitude: item.latitude,
          longitude: item.longitude,
        });
        that.setData({
          'markers[0].longitude': item.longitude,
          'markers[0].latitude': item.latitude,
        });
      }
    });
    app.globalData.ships.forEach(sp => {
      sp.ship.width = 30;
      sp.ship.height = 30;
    });
    if(app.globalData.ships[0].ship.id == e.markerId)
      shipid = 0;
    if(app.globalData.ships[1].ship.id == e.markerId)
      shipid = 1;
    if(app.globalData.ships[2].ship.id == e.markerId)
      shipid = 2;
    if(app.globalData.ships[3].ship.id == e.markerId)
      shipid = 3;
    if(app.globalData.ships[4].ship.id == e.markerId)
      shipid = 4;
    app.globalData.ships[shipid].ship.width = 45;
    app.globalData.ships[shipid].ship.height = 45;
    console.log(shipid)
    that.setData({
      CurRudder: app.globalData.ships[shipid].rudder,
      UserSetPower: app.globalData.ships[shipid].power,
      EnableAuto: !stm32.GetEnableManual(shipid),
    });
    this.updatewaypoints();
  },
  //地图区域移动
  onRegionChange(event) {
    var that = this
    if (event.type === 'end' && event.causedBy === 'drag') {
      const mapCtx = wx.createMapContext('mapId', this);
      mapCtx.getCenterLocation({
        success: res => {
          const latitude = res.latitude;
          const longitude = res.longitude;
          app.globalData.ships[shipid].waypoints.forEach(item => {
            if (item.selected) {
              item.latitude = latitude;
              item.longitude = longitude;
              stm32.ModifyWayPoint(shipid, item.id, res.longitude, res.latitude)
              wx.setStorage({key: "ships", data: app.globalData.ships});
              this.updatewaypoints();
            }
          });
          app.globalData.crossmarker[0].latitude = latitude;
          app.globalData.crossmarker[0].longitude = longitude;
          mapCtx.getScale({success:res=>{
            app.globalData.crossmarker[0].mapscale = res.scale;
          }}
          );    
          wx.setStorage({key: "crossmarker", data: app.globalData.crossmarker});
          that.setData({
            'markers[0].longitude': app.globalData.crossmarker[0].longitude,
            'markers[0].latitude': app.globalData.crossmarker[0].latitude,
          });
        }
      });
    }
  }
})