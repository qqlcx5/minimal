<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUsvStore } from '@/store/usv'
import { getTxBuf, addWayPoint as stm32AddWayPoint, deleteWayPoint as stm32DeleteWayPoint, deleteAllWayPoint as stm32DeleteAllWayPoint, modifyWayPoint as stm32ModifyWayPoint, startUpdateWayPoint, updateWayPoint as stm32UpdateWayPoint, endUpdateWayPoint, removeInstruction, clearInstructions, setEnableManual, getEnableManual, setForceSetZPoint, setCalibINS } from '@/utils/stm32Com'
import { wgs84ToGcj02, getRealDistance } from '@/utils/wsCoordinate'
import { compute } from '@/utils/crcCalc'
import type { MapMarker, Polyline } from '@/types/usv'

definePage({
  style: {
    navigationBarTitleText: 'USV 控制',
    pageOrientation: 'landscape',
  },
})

const usvStore = useUsvStore()

// 页面参数
const connectedDeviceId = ref('')
const connectedDevicename = ref('')

// 蓝牙相关
const deviceId = ref('')
const serviceId = ref('')
const characteristicId = ref('')

// 船舶ID
let shipid = 0

// 定时器和状态
let interval: number | null = null
let rxTimeOut = 0
let timeout = 0
let rudderdragtime = 0

// 页面状态
const EnableAuto = ref(false)
const mapscale = ref(10)
const userAccelerometer = ref(true)
const ShowSettings = ref(false)

// 控制状态
const CMD25_Data2Power = ref(0)
const SpeedKnot = ref(0)
const CMD23_Data2BatteryVoltage = ref(0)
const CMD27_Data6SingleMin = ref(0)
const CurRudder = ref(0)
const UserSetPower = ref(0)
const powerslidervalue = ref(60)
const rudderslidervalue = ref(60)
const powerbuttoncolor = ref('#757575')
const rudderbuttoncolor = ref('#757575')

// 连接状态
const LocalOK = ref(false)
const RemoteOK = ref(false)
const USVOnline = ref(false)
const RxCount = ref(0)

// 地图数据
const markers = ref<MapMarker[]>([])
const polyline = ref<Polyline[]>([
  {
    points: [],
    color: '#ff7043',
    width: 1,
  },
  {
    points: [],
    color: '#3875FF',
    width: 1,
  },
])

/**
 * 更新航点显示
 */
function updatewaypoints() {
  const crossmarker = usvStore.crossmarker
  const ships = usvStore.ships
  const currentShip = ships[shipid]

  markers.value = [
    ...crossmarker,
    ...ships.map(s => s.ship),
    currentShip.plos,
    ...currentShip.waypoints,
  ]

  polyline.value[0].points = currentShip.waypoints.map(wp => ({
    latitude: wp.latitude,
    longitude: wp.longitude,
  }))

  polyline.value[1].points = currentShip.points
}

/**
 * 更新船舶位置
 */
function updateships() {
  const ships = usvStore.ships
  updatewaypoints()
}

/**
 * 开始定时发送
 */
function startInter() {
  interval = setInterval(() => {
    rudderdragtime++
    if (rxTimeOut < 0 || rxTimeOut > 20) {
      console.log('RxTimeOut:', rxTimeOut)
      writeBLECharacteristicValue()
      rxTimeOut = 1
    }
    rxTimeOut++
  }, 50)
}

/**
 * 写入蓝牙特征值
 */
function writeBLECharacteristicValue() {
  const ship = usvStore.ships[shipid]
  const arr = getTxBuf(shipid, ship.power, -ship.rudder)

  uni.writeBLECharacteristicValue({
    deviceId: deviceId.value,
    serviceId: serviceId.value,
    characteristicId: characteristicId.value,
    value: new Uint8Array(arr).buffer,
    fail: (res) => {
      timeout++
      if (timeout > 1) {
        reconnectBLE()
      }
      uni.showToast({
        title: '发送失败',
        icon: 'none',
      })
    },
    success: () => {
      timeout = 0
    },
  })
}

/**
 * 重连蓝牙
 */
function reconnectBLE() {
  uni.createBLEConnection({
    deviceId: deviceId.value,
    success: () => {
      getBLEDeviceServices(connectedDeviceId.value)
    },
    fail: (res) => {
      console.log('重连失败:', res)
    },
  })
}

/**
 * 获取蓝牙设备服务
 */
function getBLEDeviceServices(deviceIdParam: string) {
  if (!deviceIdParam || deviceIdParam === '0') {
    return
  }

  uni.getBLEDeviceServices({
    deviceId: deviceIdParam,
    fail: (res) => {
      console.error('获取服务失败:', res)
    },
    success: (res) => {
      console.log('获取服务成功')
      for (let i = 0; i < res.services.length; i++) {
        const uuid = res.services[i].uuid
        if (usvStore.bleserviceuuid.indexOf(uuid) >= 0) {
          getBLEDeviceCharacteristics(deviceIdParam, uuid)
          return
        }
      }
    },
  })
}

/**
 * 获取蓝牙特征值
 */
function getBLEDeviceCharacteristics(deviceIdParam: string, serviceIdParam: string) {
  uni.getBLEDeviceCharacteristics({
    deviceId: deviceIdParam,
    serviceId: serviceIdParam,
    success: (res) => {
      console.log('获取特征值成功', res.characteristics)
      timeout = 0
      deviceId.value = deviceIdParam
      serviceId.value = serviceIdParam

      for (let i = 0; i < res.characteristics.length; i++) {
        const item = res.characteristics[i]
        if (item.properties.read) {
          uni.readBLECharacteristicValue({
            deviceId: deviceIdParam,
            serviceId: serviceIdParam,
            characteristicId: item.uuid,
          })
        }
        if (usvStore.bletxuuid.indexOf(item.uuid) >= 0) {
          characteristicId.value = item.uuid
          writeBLECharacteristicValue()
        }
        if (item.properties.notify || item.properties.indicate) {
          uni.notifyBLECharacteristicValueChange({
            deviceId: deviceIdParam,
            serviceId: serviceIdParam,
            characteristicId: item.uuid,
            state: true,
          })
        }
      }

      // 初始化航点
      for (let i = 0; i < usvStore.ships.length; i++) {
        startUpdateWayPoint(i)
        for (let j = 0; j < usvStore.ships[i].waypoints.length; j++) {
          const wp = usvStore.ships[i].waypoints[j]
          stm32UpdateWayPoint(i, wp.id, wp.longitude, wp.latitude)
        }
        endUpdateWayPoint(i)
      }
    },
    fail: (res) => {
      console.error('获取特征值失败:', res)
    },
  })

  onBLEDateReceiverd()
}

/**
 * 蓝牙数据接收处理
 */
function onBLEDateReceiverd() {
  uni.onBLECharacteristicValueChange((characteristic) => {
    if (characteristic.value.byteLength < 5) {
      return
    }

    const view = new DataView(characteristic.value)
    const arr: number[] = []
    for (let i = 0; i < view.byteLength - 2; i++) {
      arr.push(view.getInt8(i))
    }

    const calcCrc = compute(arr, arr.length)
    const recCrc = view.getInt16(view.byteLength - 2, false) & 0xffff

    if (calcCrc !== recCrc) {
      return
    }

    const id = view.getUint8(0)

    if (id === shipid) {
      LocalOK.value = (view.getInt8(2) & 0x02) !== 0
      RemoteOK.value = (view.getInt8(2) & 0x04) !== 0
      USVOnline.value = (view.getInt8(2) & 0x08) !== 0
    }

    switch (view.getUint8(1)) {
      case 0: {
        const lat = view.getInt32(6, true) / 1000000.0
        const lng = view.getInt32(10, true) / 1000000.0
        const result = wgs84ToGcj02(lng, lat)
        const point = [{
          latitude: result[1],
          longitude: result[0],
        }]

        const ship = usvStore.ships[id]
        if (ship.points.length === 0 || getRealDistance(result[0], result[1], ship.points[ship.points.length - 1].longitude, ship.points[ship.points.length - 1].latitude) > 8) {
          ship.points = ship.points.concat(point)
        }
        if (ship.points.length > 500) {
          ship.points = ship.points.slice(1, ship.points.length)
        }

        ship.ship.rotate = view.getInt16(4, true) / 10.0
        ship.ship.longitude = result[0]
        ship.ship.latitude = result[1]
        updateships()
        break
      }
      case 1: {
        const lat = view.getInt32(14, true) / 1000000.0
        const lng = view.getInt32(10, true) / 1000000.0
        const result = wgs84ToGcj02(lng, lat)
        if (id === shipid) {
          const ship = usvStore.ships[shipid]
          ship.plos.longitude = result[0]
          ship.plos.latitude = result[1]
          CMD23_Data2BatteryVoltage.value = Number((view.getInt16(8, true) / 10.0).toFixed(1))
          updatewaypoints()
        }
        break
      }
      case 2: {
        const lat = view.getInt32(14, true) / 1000000.0
        const lng = view.getInt32(10, true) / 1000000.0
        const result = wgs84ToGcj02(lng, lat)
        if (id === shipid) {
          const ship = usvStore.ships[shipid]
          ship.plos.longitude = result[0]
          ship.plos.latitude = result[1]
          CMD25_Data2Power.value = view.getInt16(8, true)
          updatewaypoints()
        }
        break
      }
      case 3: {
        const lat = view.getInt32(14, true) / 1000000.0
        const lng = view.getInt32(10, true) / 1000000.0
        const result = wgs84ToGcj02(lng, lat)
        if (id === shipid) {
          const ship = usvStore.ships[shipid]
          ship.plos.longitude = result[0]
          ship.plos.latitude = result[1]
          SpeedKnot.value = Number((view.getInt16(4, true) / 10.0).toFixed(1))
          CMD27_Data6SingleMin.value = view.getInt16(8, true)
          updatewaypoints()
        }
        break
      }
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
        removeInstruction(id, view.getInt8(1), view.getInt16(4))
        break
      case 0xff:
        usvStore.Observe = true
        clearInstructions()
        switch (view.getUint8(2)) {
          case 5:
            startUpdateWayPointLocal()
            break
          case 6: {
            const lng = view.getInt32(7) / 1000000.0
            const lat = view.getInt32(11) / 1000000.0
            const result = wgs84ToGcj02(lng, lat)
            updateWayPointLocal(view.getInt16(5), result[0], result[1])
            break
          }
          case 7:
            endUpdateWayPointLocal()
            break
        }
        break
      default:
        break
    }

    rxTimeOut = 20
    RxCount.value++

    if (id === shipid && rudderdragtime > 20) {
      CurRudder.value = view.getInt8(3)
    }
  })
}

/**
 * 开始更新航点
 */
function startUpdateWayPointLocal() {
  usvStore.ships[shipid].waypoints.forEach((element) => {
    element.updated = false
  })
}

/**
 * 更新航点
 */
function updateWayPointLocal(id: number, lng: number, lat: number) {
  let ok = false
  usvStore.ships[shipid].waypoints.forEach((item) => {
    if (item.id === id) {
      ok = true
      item.latitude = lat
      item.longitude = lng
      updatewaypoints()
    }
  })

  if (!ok) {
    const point: MapMarker = {
      id,
      anchor: { x: 0.5, y: 1 },
      iconPath: '/static/images/reddotmark.png',
      width: 20,
      height: 20,
      latitude: lat,
      longitude: lng,
      selected: false,
      updated: true,
    }

    for (let i = 0; i < usvStore.ships[shipid].waypoints.length; i++) {
      if (!usvStore.ships[shipid].waypoints[i].updated) {
        usvStore.ships[shipid].waypoints.splice(i, 0, point as any)
        ok = true
        break
      }
    }
    if (!ok) {
      usvStore.ships[shipid].waypoints.push(point as any)
    }
    updatewaypoints()
  }
}

/**
 * 结束更新航点
 */
function endUpdateWayPointLocal() {
  for (let i = 0; i < usvStore.ships[shipid].waypoints.length; i++) {
    if (!usvStore.ships[shipid].waypoints[i].updated) {
      usvStore.ships[shipid].waypoints.splice(i, 1)
    }
  }
  updatewaypoints()
}

/**
 * 功率滑块拖动
 */
function onPowerDrag(event: any) {
  let result = 0
  let color = '#757575'
  const value = 60 - Number(event.detail.value)

  if (value < -10 || value > 10) {
    result = value
  }

  if (result < 0) {
    result = result + 10
    color = '#ff7043'
  }
  else if (result > 0) {
    result = result - 10
    color = '#00b26a'
  }

  usvStore.ships[shipid].power = Number((result * 2).toFixed(0))
  UserSetPower.value = usvStore.ships[shipid].power
  powerslidervalue.value = event.detail.value
  powerbuttoncolor.value = color
}

/**
 * 舵角滑块拖动
 */
function onRudderDrag(event: any) {
  rudderdragtime = 0
  if (userAccelerometer.value || !getEnableManual(shipid)) {
    return
  }

  let result = 0
  let color = '#757575'
  const value = 60 - Number(event.detail.value)

  if (value < -10 || value > 10) {
    result = value
  }

  if (result < 0) {
    result = result + 10
    color = '#ff7043'
  }
  else if (result > 0) {
    result = result - 10
    color = '#ff7043'
  }

  usvStore.ships[shipid].rudder = Number((-result * 2).toFixed(0))
  rudderslidervalue.value = event.detail.value
  CurRudder.value = usvStore.ships[shipid].rudder
  rudderbuttoncolor.value = color
}

/**
 * 自动模式切换
 */
function autoChange(e: any) {
  setEnableManual(shipid, !e.detail.value)
  EnableAuto.value = !getEnableManual(shipid)
}

/**
 * 加速度计开关
 */
function userAccelerometerChange(e: any) {
  usvStore.setUserAccelerometer(e.detail.value)
  userAccelerometer.value = e.detail.value
}

/**
 * 设置舵机零点
 */
function forceSetZPoint() {
  setForceSetZPoint(shipid)
}

/**
 * 标定磁力计
 */
function calibINS() {
  setCalibINS(shipid)
}

/**
 * 添加航点
 */
function addWayPoint() {
  const mapCtx = uni.createMapContext('mapId')
  mapCtx.getCenterLocation({
    success: (res) => {
      let id = 0
      if (usvStore.ships[shipid].waypoints.length > 0) {
        id = usvStore.ships[shipid].waypoints[usvStore.ships[shipid].waypoints.length - 1].id + 1
      }

      const point: MapMarker = {
        id,
        anchor: { x: 0.5, y: 1 },
        iconPath: '/static/images/reddotmark.png',
        width: 20,
        height: 20,
        latitude: res.latitude,
        longitude: res.longitude,
        selected: false,
        updated: false,
      }

      usvStore.addWayPoint(shipid, point as any)
      updatewaypoints()
      stm32AddWayPoint(shipid, id, res.longitude, res.latitude)
    },
  })
}

/**
 * 删除选中航点
 */
function deleteWayPoint() {
  const waypoints = usvStore.ships[shipid].waypoints
  for (let i = waypoints.length - 1; i >= 0; i--) {
    if (waypoints[i].selected) {
      stm32DeleteWayPoint(shipid, waypoints[i].id)
      usvStore.deleteWayPoint(shipid, waypoints[i].id)
    }
  }
  updatewaypoints()
}

/**
 * 删除所有航点
 */
function deleteAllWayPoint() {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除所有航点吗？',
    success: (res) => {
      if (res.confirm) {
        stm32DeleteAllWayPoint(shipid)
        usvStore.deleteAllWayPoints(shipid)
        updatewaypoints()
      }
    },
  })
}

/**
 * 显示设置
 */
function showsettings() {
  ShowSettings.value = !ShowSettings.value
}

/**
 * 地图点击
 */
function onMapTap() {
  let sel = false
  usvStore.ships[shipid].waypoints.forEach((item) => {
    if (item.selected) {
      sel = true
    }
    item.width = 20
    item.height = 20
    item.selected = false
  })

  usvStore.ships.forEach((sp) => {
    sp.ship.width = 30
    sp.ship.height = 30
  })

  usvStore.ships[shipid].ship.width = 45
  usvStore.ships[shipid].ship.height = 45

  if (sel) {
    CurRudder.value = usvStore.ships[shipid].rudder
    UserSetPower.value = usvStore.ships[shipid].power
    updatewaypoints()
  }

  EnableAuto.value = !getEnableManual(shipid)
}

/**
 * 标记点点击
 */
function onMarkerTap(e: any) {
  usvStore.ships[shipid].waypoints.forEach((item) => {
    item.width = 20
    item.height = 20
    item.selected = false
    if (e.markerId === item.id) {
      item.width = 25
      item.height = 25
      item.selected = true
      const mapCtx = uni.createMapContext('mapId')
      mapCtx.moveToLocation({
        latitude: item.latitude,
        longitude: item.longitude,
      })
      const crossmarker = usvStore.crossmarker[0]
      crossmarker.longitude = item.longitude
      crossmarker.latitude = item.latitude
      updatewaypoints()
    }
  })

  usvStore.ships.forEach((sp) => {
    sp.ship.width = 30
    sp.ship.height = 30
  })

  // 切换船舶
  for (let i = 0; i < usvStore.ships.length; i++) {
    if (usvStore.ships[i].ship.id === e.markerId) {
      shipid = i
      break
    }
  }

  usvStore.ships[shipid].ship.width = 45
  usvStore.ships[shipid].ship.height = 45

  CurRudder.value = usvStore.ships[shipid].rudder
  UserSetPower.value = usvStore.ships[shipid].power
  EnableAuto.value = !getEnableManual(shipid)
  updatewaypoints()
}

/**
 * 地图区域变化
 */
function onRegionChange(event: any) {
  if (event.type === 'end' && event.causedBy === 'drag') {
    const mapCtx = uni.createMapContext('mapId')
    mapCtx.getCenterLocation({
      success: (res) => {
        const latitude = res.latitude
        const longitude = res.longitude

        usvStore.ships[shipid].waypoints.forEach((item) => {
          if (item.selected) {
            item.latitude = latitude
            item.longitude = longitude
            stm32ModifyWayPoint(shipid, item.id, res.longitude, res.latitude)
            usvStore.saveShipsToStorage()
            updatewaypoints()
          }
        })

        usvStore.updateCrossMarker(latitude, longitude)
        mapCtx.getScale({
          success: (scaleRes) => {
            usvStore.updateCrossMarker(latitude, longitude, scaleRes.scale)
            mapscale.value = scaleRes.scale
          },
        })
        updatewaypoints()
      },
    })
  }
}

/**
 * 加速度计变化监听
 */
function onAccelerometerChange(res: any) {
  if (!userAccelerometer.value || !getEnableManual(shipid)) {
    return
  }

  let result = 0
  const value = res.y * 100

  if (value < -15 || value > 15) {
    result = value
  }

  if (result < 0) {
    result = result + 15
  }
  else if (result > 0) {
    result = result - 15
  }

  result = Number((-(result * 3)).toFixed(0))

  const ship = usvStore.ships[shipid]
  if (result === 0 || ship.rudder - result > 2 || ship.rudder - result < -2) {
    ship.rudder = result
    CurRudder.value = result
  }
}

onLoad((options) => {
  connectedDeviceId.value = options.connectedDeviceId || ''
  connectedDevicename.value = decodeURIComponent(options.connectedDevicename || '0')
  userAccelerometer.value = usvStore.userAccelerometer
  mapscale.value = usvStore.crossmarker[0].mapscale

  updatewaypoints()

  const mapCtx = uni.createMapContext('mapId')
  const crossmarker = usvStore.crossmarker[0]
  mapCtx.moveToLocation({
    latitude: crossmarker.latitude,
    longitude: crossmarker.longitude,
  })

  // 监听加速度计
  uni.onAccelerometerChange(onAccelerometerChange)

  // 初始化蓝牙连接
  if (connectedDeviceId.value && connectedDeviceId.value !== '0') {
    getBLEDeviceServices(connectedDeviceId.value)
    startInter()
  }
})

onMounted(() => {
  // 保持屏幕常亮
  uni.setKeepScreenOn({
    keepScreenOn: true,
  })
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
  uni.stopBluetoothDevicesDiscovery()
  if (connectedDeviceId.value && connectedDeviceId.value !== '0') {
    uni.closeBLEConnection({
      deviceId: connectedDeviceId.value,
    })
  }
  uni.closeBluetoothAdapter()
})
</script>

<template>
  <view class="container-row">
    <view
      v-if="userAccelerometer"
      class="fixed-height"
    >
      <text class="page-body-title">当前舵角: {{ CurRudder }}</text>
    </view>
    <view class="auto-full-height">
      <view class="container-column">
        <view class="auto-full-width">
          <map
            id="mapId"
            class="map"
            :latitude="usvStore.crossmarker[0].latitude"
            :longitude="usvStore.crossmarker[0].longitude"
            :scale="mapscale"
            :markers="markers"
            :polyline="polyline"
            @regionchange="onRegionChange"
            @markertap="onMarkerTap"
            @tap="onMapTap"
          >
            <view class="map-button">
              <view class="map-button1">
                <wd-switch
                  :model-value="EnableAuto"
                  @change="autoChange"
                >
                  自动
                </wd-switch>
                <wd-button
                  type="primary"
                  size="small"
                  @click="addWayPoint"
                >
                  添加点
                </wd-button>
                <wd-button
                  type="warning"
                  size="small"
                  @click="deleteWayPoint"
                >
                  删除点
                </wd-button>
                <wd-button
                  type="info"
                  size="small"
                  @click="showsettings"
                >
                  设置
                </wd-button>
              </view>
              <view
                v-if="ShowSettings"
                class="map-settings"
              >
                <wd-button
                  type="error"
                  size="small"
                  @click="deleteAllWayPoint"
                >
                  删除所有路径
                </wd-button>
                <wd-button
                  type="warning"
                  size="small"
                  @click="forceSetZPoint"
                >
                  设置舵机零点
                </wd-button>
                <wd-button
                  type="info"
                  size="small"
                  @click="calibINS"
                >
                  标定磁力计
                </wd-button>
                <wd-switch
                  :model-value="userAccelerometer"
                  @change="userAccelerometerChange"
                >
                  加速度计
                </wd-switch>
              </view>
            </view>
          </map>
        </view>
        <view class="fixed-width">
          <view class="power-slider">
            <slider
              :value="powerslidervalue"
              :max="120"
              :min="0"
              :step="1"
              active-color="#f8f8f8"
              inactive-color="#f8f8f8"
              block-color="#ffffff"
              block-size="20"
              vertical
              @change="onPowerDrag"
            />
            <view
              class="power-button"
              :style="{ backgroundColor: powerbuttoncolor }"
            >
              {{ UserSetPower }}
            </view>
          </view>
        </view>
      </view>
    </view>
    <view
      v-if="!userAccelerometer"
      class="fixed-height"
    >
      <view class="rudder-slider">
        <slider
          :value="rudderslidervalue"
          :max="120"
          :min="0"
          :step="1"
          active-color="#f8f8f8"
          inactive-color="#f8f8f8"
          block-color="#ffffff"
          block-size="20"
          @change="onRudderDrag"
        />
        <view
          class="rudder-button"
          :style="{ backgroundColor: rudderbuttoncolor }"
        >
          {{ CurRudder }}
        </view>
      </view>
    </view>
    <view class="fixed-height status-bar">
      <view class="status-info">
        <view class="status-item">
          <text class="label">功率:</text>
          <text class="value">{{ CMD25_Data2Power }}W</text>
        </view>
        <view class="status-item">
          <text class="label">电压:</text>
          <text class="value">{{ CMD23_Data2BatteryVoltage }}V</text>
        </view>
        <view class="status-item">
          <text class="label">速度:</text>
          <text class="value">{{ SpeedKnot }}</text>
        </view>
        <view class="status-item">
          <text class="label">运行时间:</text>
          <text class="value">{{ CMD27_Data6SingleMin }}</text>
        </view>
      </view>
      <view class="status-indicators">
        <view
          class="indicator"
          :class="{ 'indicator-ok': LocalOK, 'indicator-error': !LocalOK }"
        >
          主控
        </view>
        <view
          class="indicator"
          :class="{ 'indicator-ok': USVOnline, 'indicator-error': !USVOnline }"
        >
          基站
        </view>
        <view
          class="indicator"
          :class="{ 'indicator-ok': RemoteOK, 'indicator-error': !RemoteOK }"
        >
          遥控
        </view>
        <view class="rx-count">
          {{ RxCount }}
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.container-row {
  width: 100%;
  height: 100vh;
  background-color: #f8f8f8;
  display: flex;
  flex-direction: column;
}

.fixed-height {
  flex: 0 0 auto;
}

.auto-full-height {
  flex: 1 1 auto;
  position: relative;
}

.container-column {
  background-color: transparent;
  position: absolute;
  display: flex;
  flex-direction: row;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

.fixed-width {
  flex: 0 0 auto;
  width: 120rpx;
}

.auto-full-width {
  flex: 1 1 auto;
  position: relative;
}

.map {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.page-body-title {
  display: inline-block;
  width: 300rpx;
  padding: 16rpx;
  font-size: 28rpx;
  color: #333;
}

.map-button {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 16rpx;
  padding: 16rpx;
  display: flex;
  flex-direction: row;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  margin: 20rpx;
}

.map-button1 {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  min-width: 196rpx;
}

.map-settings {
  margin-left: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  min-width: 300rpx;
}

.power-slider {
  height: 80%;
  top: 10%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 32rpx;
}

.power-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  width: 160rpx;
  height: 120rpx;
  font-size: 40rpx;
  font-weight: bold;
  color: #ffffff;
}

.rudder-slider {
  width: 50%;
  left: 5%;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32rpx 0;
}

.rudder-button {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 16rpx;
  width: 120rpx;
  height: 100rpx;
  font-size: 36rpx;
  font-weight: bold;
  color: #ffffff;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 32rpx;
  background-color: #ffffff;
  border-top: 1px solid #e0e0e0;
}

.status-info {
  display: flex;
  gap: 32rpx;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.label {
  font-size: 24rpx;
  color: #666;
}

.value {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.status-indicators {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.indicator {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #ffffff;
}

.indicator-ok {
  background-color: #38ff92;
}

.indicator-error {
  background-color: #ff7043;
}

.rx-count {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-left: 16rpx;
}
</style>
