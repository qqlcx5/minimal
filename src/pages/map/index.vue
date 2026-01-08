<template>
  <view class="page-container">
    <!-- 地图背景 -->
    <map
      id="mapId"
      class="map-bg"
      :latitude="usvStore.crossmarker[0].latitude"
      :longitude="usvStore.crossmarker[0].longitude"
      :scale="mapscale"
      :markers="markers"
      :polyline="polyline"
      @regionchange="onRegionChange"
      @markertap="onMarkerTap"
      @tap="onMapTap"
    />

    <!-- 顶部标题栏 -->
    <view class="header-bar">
      <text class="header-title">云台控制</text>
    </view>

    <!-- 左侧：方向控制盘 -->
    <view class="direction-panel">
      <view class="direction-wheel" @touchstart="onWheelTouchStart" @touchmove="onWheelTouchMove" @touchend="onWheelTouchEnd">
        <view class="wheel-outer">
          <view class="wheel-btn wheel-up" :class="{ active: activeDirection === 'up' }" @tap="onDirectionTap('up')">
            <text class="arrow">▲</text>
          </view>
          <view class="wheel-btn wheel-right" :class="{ active: activeDirection === 'right' }" @tap="onDirectionTap('right')">
            <text class="arrow">▶</text>
          </view>
          <view class="wheel-btn wheel-down" :class="{ active: activeDirection === 'down' }" @tap="onDirectionTap('down')">
            <text class="arrow">▼</text>
          </view>
          <view class="wheel-btn wheel-left" :class="{ active: activeDirection === 'left' }" @tap="onDirectionTap('left')">
            <text class="arrow">◀</text>
          </view>
          <view class="wheel-center">
            <view class="center-dot" />
          </view>
        </view>
      </view>
      <view class="direction-label">
        <text>舵角: {{ CurRudder }}°</text>
      </view>
    </view>

    <!-- 中间：罗盘 -->
    <view class="compass-panel">
      <view class="compass-ring">
        <text class="compass-dir compass-n">N</text>
        <text class="compass-dir compass-e">E</text>
        <text class="compass-dir compass-s">S</text>
        <text class="compass-dir compass-w">W</text>
        <view class="compass-cross-h" />
        <view class="compass-cross-v" />
        <view class="ship-icon" :style="{ transform: `rotate(${shipRotate}deg)` }">
          <image src="/static/images/ship0.png" class="ship-img" mode="aspectFit" />
        </view>
      </view>
    </view>

    <!-- 右侧：加减速控制 -->
    <view class="speed-panel">
      <view class="speed-btn speed-up" @tap="onSpeedUp" @longpress="onSpeedUpLong">
        <text class="speed-label">加速</text>
        <text class="speed-icon">＋</text>
      </view>
      <view class="speed-display">
        <text class="speed-value">{{ UserSetPower }}</text>
        <text class="speed-unit">%</text>
      </view>
      <view class="speed-btn speed-down" @tap="onSpeedDown" @longpress="onSpeedDownLong">
        <text class="speed-label">减速</text>
        <text class="speed-icon">－</text>
      </view>
    </view>

    <!-- 底部状态栏 -->
    <view class="status-bar">
      <view class="status-item">
        <text class="status-label">功率:</text>
        <text class="status-value">{{ CMD25_Data2Power }}W</text>
      </view>
      <view class="status-item">
        <text class="status-label">电压:</text>
        <text class="status-value">{{ CMD23_Data2BatteryVoltage }}V</text>
      </view>
      <view class="status-item">
        <text class="status-label">速度:</text>
        <text class="status-value">{{ SpeedKnot }}节</text>
      </view>
      <view class="indicator" :class="LocalOK ? 'ok' : 'error'">主控</view>
      <view class="indicator" :class="USVOnline ? 'ok' : 'error'">基站</view>
      <view class="indicator" :class="RemoteOK ? 'ok' : 'error'">遥控</view>
      <view class="settings-btn" @tap="showsettings">⚙</view>
    </view>

    <!-- 底部设置面板 -->
    <view v-if="ShowSettings" class="settings-panel">
      <view class="settings-row">
        <view class="setting-item">
          <text>自动</text>
          <switch :checked="EnableAuto" @change="autoChange" />
        </view>
        <view class="setting-item">
          <text>陀螺仪</text>
          <switch :checked="userAccelerometer" @change="userAccelerometerChange" />
        </view>
        <view class="setting-btn" @tap="addWayPoint">添加点</view>
        <view class="setting-btn warn" @tap="deleteWayPoint">删除点</view>
        <view class="setting-btn danger" @tap="deleteAllWayPoint">清空</view>
        <view class="setting-btn" @tap="forceSetZPoint">零点</view>
        <view class="setting-btn" @tap="calibINS">标定</view>
        <view class="setting-btn close" @tap="showsettings">✕</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { Polyline, WayPoint } from '@/types/usv'
import { onLoad, onReady } from '@dcloudio/uni-app'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useUsvStore } from '@/store/usv'
import { compute } from '@/utils/crcCalc'
import { clearInstructions, endUpdateWayPoint, getEnableManual, getTxBuf, removeInstruction, setCalibINS, setEnableManual, setForceSetZPoint, startUpdateWayPoint, addWayPoint as stm32AddWayPoint, deleteAllWayPoint as stm32DeleteAllWayPoint, deleteWayPoint as stm32DeleteWayPoint, modifyWayPoint as stm32ModifyWayPoint, updateWayPoint as stm32UpdateWayPoint } from '@/utils/stm32Com'
import { getRealDistance, wgs84ToGcj02 } from '@/utils/wsCoordinate'

definePage({
  style: {
    navigationBarTitleText: 'USV 控制',
    navigationStyle: 'custom',
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
let interval: ReturnType<typeof setInterval> | null = null
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

// 连接状态
const LocalOK = ref(false)
const RemoteOK = ref(false)
const USVOnline = ref(false)
const RxCount = ref(0)

// 方向控制
const activeDirection = ref('')

// 船只朝向
const shipRotate = computed(() => {
  return usvStore.ships[shipid]?.ship?.rotate || 0
})

// 地图数据
const markers = ref<any[]>([])
const polyline = ref<Polyline[]>([
  { points: [], color: '#ff7043', width: 1 },
  { points: [], color: '#3875FF', width: 1 },
])

// 方向控制
function onDirectionTap(dir: string) {
  activeDirection.value = dir
  const step = 10
  switch (dir) {
    case 'left':
      CurRudder.value = Math.max(-100, CurRudder.value - step)
      break
    case 'right':
      CurRudder.value = Math.min(100, CurRudder.value + step)
      break
    case 'up':
    case 'down':
      // 上下可用于其他控制
      break
  }
  usvStore.ships[shipid].rudder = CurRudder.value
  setTimeout(() => { activeDirection.value = '' }, 150)
}

let wheelTouchStartX = 0
function onWheelTouchStart(e: any) {
  wheelTouchStartX = e.touches[0].clientX
}

function onWheelTouchMove(e: any) {
  const deltaX = e.touches[0].clientX - wheelTouchStartX
  const sensitivity = 0.5
  let newRudder = CurRudder.value + deltaX * sensitivity
  newRudder = Math.max(-100, Math.min(100, newRudder))
  CurRudder.value = Math.round(newRudder)
  usvStore.ships[shipid].rudder = CurRudder.value
  wheelTouchStartX = e.touches[0].clientX
}

function onWheelTouchEnd() {
  activeDirection.value = ''
}

// 速度控制
function onSpeedUp() {
  UserSetPower.value = Math.min(100, UserSetPower.value + 10)
  usvStore.ships[shipid].power = UserSetPower.value
}

function onSpeedDown() {
  UserSetPower.value = Math.max(-100, UserSetPower.value - 10)
  usvStore.ships[shipid].power = UserSetPower.value
}

let speedInterval: ReturnType<typeof setInterval> | null = null
function onSpeedUpLong() {
  speedInterval = setInterval(() => {
    onSpeedUp()
  }, 100)
}

function onSpeedDownLong() {
  speedInterval = setInterval(() => {
    onSpeedDown()
  }, 100)
}

// 更新航点显示
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

function updateships() {
  updatewaypoints()
}

// 定时发送
function startInter() {
  interval = setInterval(() => {
    rudderdragtime++
    if (rxTimeOut < 0 || rxTimeOut > 20) {
      writeBLECharacteristicValue()
      rxTimeOut = 1
    }
    rxTimeOut++
  }, 50)
}

function writeBLECharacteristicValue() {
  if (!deviceId.value || !serviceId.value || !characteristicId.value) return
  const ship = usvStore.ships[shipid]
  const arr = getTxBuf(shipid, UserSetPower.value, -ship.rudder)
  const buffer = new Uint8Array(arr).buffer
  uni.writeBLECharacteristicValue({
    deviceId: deviceId.value,
    serviceId: serviceId.value,
    characteristicId: characteristicId.value,
    value: buffer as any,
    fail: () => {
      timeout++
      if (timeout > 1) reconnectBLE()
    },
    success: () => { timeout = 0 },
  })
}

function reconnectBLE() {
  if (!connectedDeviceId.value || connectedDeviceId.value === '0') return
  uni.createBLEConnection({
    deviceId: connectedDeviceId.value,
    success: () => {
      setTimeout(() => getBLEDeviceServices(connectedDeviceId.value), 500)
    },
    fail: () => {},
  })
}

function getBLEDeviceServices(deviceIdParam: string) {
  if (!deviceIdParam || deviceIdParam === '0') return
  uni.getBLEDeviceServices({
    deviceId: deviceIdParam,
    success: (res) => {
      for (let i = 0; i < res.services.length; i++) {
        if (usvStore.bleserviceuuid.includes(res.services[i].uuid)) {
          getBLEDeviceCharacteristics(deviceIdParam, res.services[i].uuid)
          return
        }
      }
    },
    fail: () => {},
  })
}

function getBLEDeviceCharacteristics(deviceIdParam: string, serviceIdParam: string) {
  uni.getBLEDeviceCharacteristics({
    deviceId: deviceIdParam,
    serviceId: serviceIdParam,
    success: (res) => {
      timeout = 0
      deviceId.value = deviceIdParam
      serviceId.value = serviceIdParam
      for (let i = 0; i < res.characteristics.length; i++) {
        const item = res.characteristics[i]
        if (item.properties.read) {
          uni.readBLECharacteristicValue({ deviceId: deviceIdParam, serviceId: serviceIdParam, characteristicId: item.uuid })
        }
        if (usvStore.bletxuuid.includes(item.uuid)) {
          characteristicId.value = item.uuid
          writeBLECharacteristicValue()
        }
        if (item.properties.notify || item.properties.indicate) {
          uni.notifyBLECharacteristicValueChange({ deviceId: deviceIdParam, serviceId: serviceIdParam, characteristicId: item.uuid, state: true })
        }
      }
      for (let i = 0; i < usvStore.ships.length; i++) {
        startUpdateWayPoint(i)
        for (let j = 0; j < usvStore.ships[i].waypoints.length; j++) {
          const wp = usvStore.ships[i].waypoints[j]
          stm32UpdateWayPoint(i, wp.id, wp.longitude, wp.latitude)
        }
        endUpdateWayPoint(i)
      }
    },
    fail: () => {},
  })
  onBLEDateReceiverd()
}

function onBLEDateReceiverd() {
  uni.onBLECharacteristicValueChange((characteristic) => {
    const buffer = characteristic.value as unknown as ArrayBuffer
    if (buffer.byteLength < 5) return
    const view = new DataView(buffer)
    const arr: number[] = []
    for (let i = 0; i < view.byteLength - 2; i++) arr.push(view.getInt8(i))
    const calcCrc = compute(arr, arr.length)
    const recCrc = view.getInt16(view.byteLength - 2, false) & 0xFFFF
    if (calcCrc !== recCrc) return

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
        const point = [{ latitude: result[1], longitude: result[0] }]
        const ship = usvStore.ships[id]
        if (ship.points.length === 0 || getRealDistance(result[0], result[1], ship.points[ship.points.length - 1].longitude, ship.points[ship.points.length - 1].latitude) > 8) {
          ship.points = ship.points.concat(point)
        }
        if (ship.points.length > 500) ship.points = ship.points.slice(1)
        ship.ship.rotate = view.getInt16(4, true) / 10.0
        ship.ship.longitude = result[0]
        ship.ship.latitude = result[1]
        updateships()
        break
      }
      case 1: {
        if (id === shipid) {
          CMD23_Data2BatteryVoltage.value = Number((view.getInt16(8, true) / 10.0).toFixed(1))
        }
        break
      }
      case 2: {
        if (id === shipid) {
          CMD25_Data2Power.value = view.getInt16(8, true)
        }
        break
      }
      case 3: {
        if (id === shipid) {
          SpeedKnot.value = Number((view.getInt16(4, true) / 10.0).toFixed(1))
          CMD27_Data6SingleMin.value = view.getInt16(8, true)
        }
        break
      }
      case 4: case 5: case 6: case 7: case 8: case 9: case 10: case 11:
        removeInstruction(id, view.getInt8(1), view.getInt16(4))
        break
      case 0xFF:
        usvStore.Observe = true
        clearInstructions()
        switch (view.getUint8(2)) {
          case 5: startUpdateWayPointLocal(); break
          case 6: {
            const lng = view.getInt32(7) / 1000000.0
            const lat = view.getInt32(11) / 1000000.0
            const result = wgs84ToGcj02(lng, lat)
            updateWayPointLocal(view.getInt16(5), result[0], result[1])
            break
          }
          case 7: endUpdateWayPointLocal(); break
        }
        break
    }
    rxTimeOut = 20
    RxCount.value++
    if (id === shipid && rudderdragtime > 20) {
      CurRudder.value = view.getInt8(3)
    }
  })
}

function startUpdateWayPointLocal() {
  usvStore.ships[shipid].waypoints.forEach(e => e.updated = false)
}

function updateWayPointLocal(id: number, lng: number, lat: number) {
  let ok = false
  usvStore.ships[shipid].waypoints.forEach(item => {
    if (item.id === id) { ok = true; item.latitude = lat; item.longitude = lng; updatewaypoints() }
  })
  if (!ok) {
    const point: WayPoint = { id, anchor: { x: 0.5, y: 1 }, iconPath: '/static/images/reddotmark.png', width: 20, height: 20, latitude: lat, longitude: lng, selected: false, updated: true }
    usvStore.ships[shipid].waypoints.push(point as any)
    updatewaypoints()
  }
}

function endUpdateWayPointLocal() {
  for (let i = usvStore.ships[shipid].waypoints.length - 1; i >= 0; i--) {
    if (!usvStore.ships[shipid].waypoints[i].updated) usvStore.ships[shipid].waypoints.splice(i, 1)
  }
  updatewaypoints()
}

function autoChange(e: any) {
  setEnableManual(shipid, !e.detail.value)
  EnableAuto.value = !getEnableManual(shipid)
}

function userAccelerometerChange(e: any) {
  usvStore.setUserAccelerometer(e.detail.value)
  userAccelerometer.value = e.detail.value
}

function forceSetZPoint() { setForceSetZPoint(shipid); uni.showToast({ title: '已设置', icon: 'success' }) }
function calibINS() { setCalibINS(shipid); uni.showToast({ title: '开始标定', icon: 'success' }) }
function showsettings() { ShowSettings.value = !ShowSettings.value }

function addWayPoint() {
  const mapCtx = uni.createMapContext('mapId')
  mapCtx.getCenterLocation({
    success: (res) => {
      let id = 0
      if (usvStore.ships[shipid].waypoints.length > 0) id = usvStore.ships[shipid].waypoints[usvStore.ships[shipid].waypoints.length - 1].id + 1
      const point: WayPoint = { id, anchor: { x: 0.5, y: 1 }, iconPath: '/static/images/reddotmark.png', width: 20, height: 20, latitude: res.latitude, longitude: res.longitude, selected: false, updated: false }
      usvStore.addWayPoint(shipid, point)
      updatewaypoints()
      stm32AddWayPoint(shipid, id, res.longitude, res.latitude)
    },
  })
}

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

function deleteAllWayPoint() {
  uni.showModal({
    title: '确认', content: '删除所有航点？',
    success: (res) => {
      if (res.confirm) {
        stm32DeleteAllWayPoint(shipid)
        usvStore.deleteAllWayPoints(shipid)
        updatewaypoints()
      }
    },
  })
}

function onMapTap() {
  usvStore.ships[shipid].waypoints.forEach(item => { item.width = 20; item.height = 20; item.selected = false })
  usvStore.ships.forEach(sp => { sp.ship.width = 30; sp.ship.height = 30 })
  usvStore.ships[shipid].ship.width = 45
  usvStore.ships[shipid].ship.height = 45
  updatewaypoints()
  EnableAuto.value = !getEnableManual(shipid)
}

function onMarkerTap(e: any) {
  usvStore.ships[shipid].waypoints.forEach(item => {
    item.width = 20; item.height = 20; item.selected = false
    if (e.markerId === item.id) { item.width = 25; item.height = 25; item.selected = true }
  })
  for (let i = 0; i < usvStore.ships.length; i++) {
    if (usvStore.ships[i].ship.id === e.markerId) { shipid = i; break }
  }
  usvStore.ships[shipid].ship.width = 45
  usvStore.ships[shipid].ship.height = 45
  CurRudder.value = Number(usvStore.ships[shipid].rudder)
  UserSetPower.value = Number(usvStore.ships[shipid].power)
  EnableAuto.value = !getEnableManual(shipid)
  updatewaypoints()
}

function onRegionChange(event: any) {
  if (event.type === 'end' && event.causedBy === 'drag') {
    const mapCtx = uni.createMapContext('mapId')
    mapCtx.getCenterLocation({
      success: (res) => {
        usvStore.ships[shipid].waypoints.forEach(item => {
          if (item.selected) {
            item.latitude = res.latitude
            item.longitude = res.longitude
            stm32ModifyWayPoint(shipid, item.id, res.longitude, res.latitude)
            usvStore.saveShipsToStorage()
            updatewaypoints()
          }
        })
        usvStore.crossmarker[0].latitude = res.latitude
        usvStore.crossmarker[0].longitude = res.longitude
        usvStore.saveCrossMarkerToStorage()
      },
    })
  }
}

function onAccelerometerChange(res: any) {
  if (!userAccelerometer.value || !getEnableManual(shipid)) return
  let result = 0
  const value = res.y * 100
  if (value < -15 || value > 15) result = value
  if (result < 0) result += 15
  else if (result > 0) result -= 15
  result = Number((-(result * 3)).toFixed(0))
  const ship = usvStore.ships[shipid]
  if (result === 0 || Math.abs(Number(ship.rudder) - result) > 2) {
    ship.rudder = result
    CurRudder.value = result
  }
}

onLoad((options: Record<string, string>) => {
  connectedDeviceId.value = options.connectedDeviceId || ''
  connectedDevicename.value = decodeURIComponent(options.connectedDevicename || '0')
  userAccelerometer.value = usvStore.userAccelerometer
  mapscale.value = usvStore.crossmarker[0].mapscale
  updatewaypoints()
  uni.onAccelerometerChange(onAccelerometerChange)
})

onReady(() => {
  if (connectedDeviceId.value && connectedDeviceId.value !== '0') {
    getBLEDeviceServices(connectedDeviceId.value)
    startInter()
  }
  uni.onBLEConnectionStateChange((res) => {
    if (!res.connected && connectedDeviceId.value && connectedDeviceId.value !== '0') {
      setTimeout(() => reconnectBLE(), 1000)
    }
  })
})

onMounted(() => {
  uni.setKeepScreenOn({ keepScreenOn: true })
  document.addEventListener('touchend', () => {
    if (speedInterval) { clearInterval(speedInterval); speedInterval = null }
  })
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
  if (speedInterval) clearInterval(speedInterval)
  uni.stopBluetoothDevicesDiscovery()
  if (connectedDeviceId.value && connectedDeviceId.value !== '0') {
    uni.closeBLEConnection({ deviceId: connectedDeviceId.value })
  }
  uni.closeBluetoothAdapter()
})
</script>

<style scoped>
.page-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

/* 地图背景 */
.map-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

/* 顶部标题栏 */
.header-bar {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  height: 32px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 0 0 8px 8px;
  z-index: 10;
}

.header-title {
  font-size: 14px;
  color: #fff;
  font-weight: bold;
  letter-spacing: 4px;
}

/* 左侧方向控制盘 */
.direction-panel {
  position: absolute;
  left: 15px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 10;
}

.direction-wheel {
  width: 120px;
  height: 120px;
}

.wheel-outer {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(42, 90, 138, 0.8);
  border: 2px solid #4a9eff;
  box-shadow: 0 0 15px rgba(74, 158, 255, 0.4);
  position: relative;
}

.wheel-btn {
  position: absolute;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wheel-btn.active .arrow {
  color: #4a9eff;
  text-shadow: 0 0 8px #4a9eff;
}

.arrow {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
}

.wheel-up { top: 4px; left: 50%; transform: translateX(-50%); }
.wheel-right { right: 4px; top: 50%; transform: translateY(-50%); }
.wheel-down { bottom: 4px; left: 50%; transform: translateX(-50%); }
.wheel-left { left: 4px; top: 50%; transform: translateY(-50%); }

.wheel-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(58, 122, 191, 0.9);
  border: 2px solid #4a9eff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4a9eff;
  box-shadow: 0 0 8px #4a9eff;
}

.direction-label {
  font-size: 11px;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  padding: 2px 8px;
  border-radius: 4px;
}

/* 中间罗盘 */
.compass-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
}

.compass-ring {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: rgba(13, 31, 51, 0.85);
  border: 2px solid #ff4444;
  box-shadow: 0 0 15px rgba(255, 68, 68, 0.4);
  position: relative;
}

.compass-dir {
  position: absolute;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
}

.compass-n { top: 6px; left: 50%; transform: translateX(-50%); color: #ff4444; }
.compass-e { right: 6px; top: 50%; transform: translateY(-50%); }
.compass-s { bottom: 6px; left: 50%; transform: translateX(-50%); }
.compass-w { left: 6px; top: 50%; transform: translateY(-50%); }

.compass-cross-h, .compass-cross-v {
  position: absolute;
  background: rgba(255, 68, 68, 0.4);
}

.compass-cross-h {
  width: 100%;
  height: 1px;
  top: 50%;
  left: 0;
}

.compass-cross-v {
  width: 1px;
  height: 100%;
  left: 50%;
  top: 0;
}

.ship-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 50px;
  margin-left: -25px;
  margin-top: -25px;
  transition: transform 0.3s;
}

.ship-img {
  width: 100%;
  height: 100%;
}

/* 右侧速度控制 */
.speed-panel {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  z-index: 10;
}

.speed-btn {
  width: 70px;
  height: 40px;
  border-radius: 6px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(42, 90, 138, 0.8);
  border: 2px solid #4a9eff;
}

.speed-btn:active {
  transform: scale(0.95);
}

.speed-label {
  font-size: 12px;
  color: #fff;
}

.speed-icon {
  font-size: 14px;
  color: #4a9eff;
  font-weight: bold;
}

.speed-display {
  display: flex;
  align-items: baseline;
  gap: 2px;
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 10px;
  border-radius: 4px;
}

.speed-value {
  font-size: 22px;
  font-weight: bold;
  color: #4a9eff;
}

.speed-unit {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}

/* 底部状态栏 */
.status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 0 15px;
  background: rgba(0, 0, 0, 0.6);
  z-index: 10;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 3px;
}

.status-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}

.status-value {
  font-size: 11px;
  color: #fff;
  font-weight: bold;
}

.indicator {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  color: #fff;
}

.indicator.ok {
  background: #38ff92;
  color: #000;
}

.indicator.error {
  background: #ff4444;
}

.settings-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  font-size: 14px;
  color: #fff;
}

/* 底部设置面板 */
.settings-panel {
  position: absolute;
  bottom: 32px;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.75);
  padding: 8px 15px;
  z-index: 20;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #fff;
}

.setting-btn {
  padding: 4px 10px;
  background: #4a9eff;
  border-radius: 4px;
  font-size: 11px;
  color: #fff;
}

.setting-btn.warn {
  background: #ff9800;
}

.setting-btn.danger {
  background: #ff4444;
}

.setting-btn.close {
  background: rgba(255, 255, 255, 0.2);
}
</style>
