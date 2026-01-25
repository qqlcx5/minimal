<script setup lang="ts">
import type { BluetoothDevice } from '@/types/bluetooth'
import { onMounted, onUnmounted, ref } from 'vue'
import { useUsvStore } from '@/store/usv'

definePage({
  style: {
    navigationBarTitleText: 'USV 控制',
    pageOrientation: 'portrait',
  },
})

const usvStore = useUsvStore()

const devices = ref<BluetoothDevice[]>([])
const connected = ref(false)
const connecting = ref(false)
const scanning = ref(false)
const discoveryStarted = ref(false)

/**
 * 在数组中查找元素索引
 */
function inArray<T>(arr: T[], key: keyof T, val: T[keyof T]): number {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return i
    }
  }
  return -1
}

/**
 * 开始扫描蓝牙设备
 */
function startBluetoothDevicesDiscovery() {
  if (discoveryStarted.value) {
    return
  }
  discoveryStarted.value = true
  scanning.value = true

  uni.openBluetoothAdapter({
    success: () => {
      console.log('蓝牙适配器打开成功')
      uni.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: true,
        success: () => {
          console.log('开始扫描蓝牙设备')
          onBluetoothDeviceFound()
        },
        fail: (err) => {
          console.error('开始扫描失败:', err)
          scanning.value = false
          discoveryStarted.value = false
          uni.showToast({
            title: '扫描失败',
            icon: 'none',
          })
        },
      })
    },
    fail: (err) => {
      console.error('打开蓝牙适配器失败:', err)
      scanning.value = false
      discoveryStarted.value = false
      if (err.errCode === 10001) {
        uni.onBluetoothAdapterStateChange((res) => {
          console.log('蓝牙适配器状态变化:', res)
          if (res.available) {
            startBluetoothDevicesDiscovery()
          }
        })
      }
      else {
        uni.showToast({
          title: '请打开蓝牙',
          icon: 'none',
        })
      }
    },
  })
}

/**
 * 监听蓝牙设备发现
 */
function onBluetoothDeviceFound() {
  uni.onBluetoothDeviceFound((res) => {
    res.devices.forEach((device) => {
      if (!device.name && !device.localName) {
        return
      }
      const foundDevices = devices.value
      const idx = inArray(foundDevices, 'deviceId', device.deviceId)
      if (idx === -1) {
        devices.value.push(device)
      }
      else {
        devices.value[idx] = device
      }
    })
  })
}

/**
 * 创建蓝牙连接
 */
function createBLEConnection(device: BluetoothDevice) {
  if (connecting.value) {
    return
  }
  connecting.value = true
  const deviceId = device.deviceId
  const name = device.name || device.localName || '未知设备'

  // 先停止扫描
  uni.stopBluetoothDevicesDiscovery({
    success: () => {
      console.log('已停止扫描蓝牙设备')
    },
    fail: (err) => {
      console.warn('停止扫描失败:', err)
    },
    complete: () => {
      // 无论成功失败都继续连接
    },
  })

  uni.createBLEConnection({
    deviceId,
    success: () => {
      console.log('蓝牙连接成功')
      connected.value = true
      connecting.value = false
      discoveryStarted.value = false
      uni.navigateTo({
        url: `/pages/map/index?connectedDeviceId=${deviceId}&connectedDevicename=${encodeURIComponent(name)}`,
      })
    },
    fail: (err) => {
      console.error('蓝牙连接失败:', err)
      connecting.value = false
      let errorMsg = '连接失败'
      if (err.errCode === 10003) {
        errorMsg = '设备连接失败，请重试'
      }
      else if (err.errCode === 10004) {
        errorMsg = '设备未找到'
      }
      else if (err.errCode === 10005) {
        errorMsg = '连接超时'
      }
      uni.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000,
      })
      // 重新开始扫描
      discoveryStarted.value = false
      startBluetoothDevicesDiscovery()
    },
  })
}

/**
 * 跳过连接
 */
function skip() {
  uni.navigateTo({
    url: '/pages/map/index?connectedDeviceId=0&connectedDevicename=0',
  })
}

/**
 * 刷新设备列表
 */
function refreshDevices() {
  devices.value = []
  discoveryStarted.value = false
  uni.stopBluetoothDevicesDiscovery({
    success: () => {
      startBluetoothDevicesDiscovery()
    },
  })
}

/**
 * 计算信号强度百分比
 */
function getRssiPercent(rssi?: number): number {
  if (rssi === undefined) {
    return 0
  }
  return Math.max(0, rssi + 100)
}

/**
 * 获取设备友好名称
 */
function getDeviceDisplayName(device: BluetoothDevice): string {
  const rawName = device.name || device.localName || ''

  // 根据设备名称识别设备类型
  if (rawName.toUpperCase().includes('USV') || rawName.toUpperCase().includes('SHIP') || rawName.toUpperCase().includes('BOAT')) {
    return `USV 设备 (${rawName})`
  }
  if (rawName.toUpperCase().includes('HC') || rawName.toUpperCase().includes('BLK') || rawName.toUpperCase().includes('BLE')) {
    return `蓝牙模块 (${rawName})`
  }
  if (rawName.toUpperCase().includes('STM')) {
    return `控制模块 (${rawName})`
  }

  // 如果有名称，直接返回
  if (rawName) {
    return rawName
  }

  return '未知设备'
}

/**
 * 获取设备类型标识
 */
function getDeviceType(device: BluetoothDevice): string {
  const rawName = (device.name || device.localName || '').toUpperCase()

  if (rawName.includes('USV') || rawName.includes('SHIP') || rawName.includes('BOAT')) {
    return 'usv'
  }
  if (rawName.includes('HC') || rawName.includes('BLK') || rawName.includes('BLE')) {
    return 'bluetooth'
  }
  if (rawName.includes('STM')) {
    return 'control'
  }

  return 'unknown'
}

/**
 * 获取信号强度等级
 */
function getSignalLevel(rssi?: number): string {
  if (rssi === undefined) return 'weak'
  if (rssi >= -50) return 'excellent'
  if (rssi >= -60) return 'good'
  if (rssi >= -70) return 'fair'
  return 'weak'
}

/**
 * 获取设备类型文本
 */
function getDeviceTypeText(device: BluetoothDevice): string {
  const type = getDeviceType(device)
  const typeMap: Record<string, string> = {
    usv: 'USV',
    bluetooth: '蓝牙',
    control: '控制',
    unknown: '其他',
  }
  return typeMap[type] || '其他'
}

/**
 * 获取信号强度文本
 */
function getSignalText(rssi?: number): string {
  const level = getSignalLevel(rssi)
  const textMap: Record<string, string> = {
    excellent: '优秀',
    good: '良好',
    fair: '一般',
    weak: '较弱',
  }
  return textMap[level] || ''
}

onMounted(() => {
  // 初始化存储数据
  usvStore.initFromStorage()
  // 开始扫描
  startBluetoothDevicesDiscovery()
})

onUnmounted(() => {
  uni.stopBluetoothDevicesDiscovery()
  uni.closeBluetoothAdapter()
})
</script>

<template>
  <view class="page-container">
    <view class="header">
      <text class="title">蓝牙设备连接</text>
      <wd-button
        type="primary"
        size="small"
        :loading="scanning"
        @click="refreshDevices"
      >
        刷新
      </wd-button>
    </view>

    <scroll-view
      v-if="devices.length > 0"
      class="device-list"
      scroll-y
      scroll-with-animation
    >
      <view
        v-for="(device, index) in devices"
        :key="index"
        class="device-item"
        :class="{ 'device-usv': getDeviceType(device) === 'usv' }"
        @click="createBLEConnection(device)"
      >
        <view class="device-icon" :class="`icon-${getDeviceType(device)}`">
          <wd-icon name="bluetooth" size="24px" />
        </view>
        <view class="device-info">
          <view class="device-name-row">
            <view class="device-name">
              {{ getDeviceDisplayName(device) }}
            </view>
            <view class="device-tag" :class="`tag-${getDeviceType(device)}`">
              {{ getDeviceTypeText(device) }}
            </view>
          </view>
          <view class="device-details">
            <view class="detail-item">
              <text class="label">信号:</text>
              <view class="signal-bar">
                <view
                  class="signal-fill"
                  :class="`signal-${getSignalLevel(device.RSSI)}`"
                  :style="{ width: `${getRssiPercent(device.RSSI)}%` }"
                />
              </view>
              <text class="value">{{ device.RSSI }}dBm</text>
              <text class="signal-text">{{ getSignalText(device.RSSI) }}</text>
            </view>
            <view class="detail-item">
              <text class="label">ID:</text>
              <text class="value">{{ device.deviceId.substring(0, 8) }}...</text>
            </view>
          </view>
        </view>
        <view class="device-action">
          <wd-icon name="arrow-right" />
        </view>
      </view>
    </scroll-view>

    <view
      v-else-if="!scanning"
      class="empty-state"
    >
      <wd-icon
        name="bluetooth"
        size="48px"
        class="empty-icon"
      />
      <text class="empty-text">未发现蓝牙设备</text>
      <text class="empty-hint">请确保蓝牙已打开并靠近设备</text>
    </view>

    <view
      v-if="scanning && devices.length === 0"
      class="loading-state"
    >
      <wd-loading />
      <text class="loading-text">正在扫描设备...</text>
    </view>

    <view class="footer">
      <wd-button
        type="default"
        block
        @click="skip"
      >
        跳过连接
      </wd-button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page-container {
  height: calc(100vh - 32rpx);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  padding: 32rpx;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
}

.device-list {
  flex: 1;
  margin-bottom: 32rpx;
}

.device-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  border: 2rpx solid transparent;
}

.device-item.device-usv {
  border-color: #4a9eff;
  background: linear-gradient(to right, #f0f7ff, #ffffff);
}

.device-item:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.device-icon {
  width: 72rpx;
  height: 72rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 20rpx;
  color: #ffffff;
  flex-shrink: 0;
}

.device-icon.icon-usv {
  background: linear-gradient(135deg, #4a9eff 0%, #2563eb 100%);
  width: 80rpx;
  height: 80rpx;
}

.device-icon.icon-bluetooth {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.device-icon.icon-control {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.device-info {
  flex: 1;
  min-width: 0;
}

.device-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.device-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-tag {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.device-tag.tag-usv {
  background: #dbeafe;
  color: #1e40af;
}

.device-tag.tag-bluetooth {
  background: #e0e7ff;
  color: #4338ca;
}

.device-tag.tag-control {
  background: #d1fae5;
  color: #065f46;
}

.device-tag.tag-unknown {
  background: #f3f4f6;
  color: #6b7280;
}

.device-details {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.detail-item {
  display: flex;
  align-items: center;
  font-size: 22rpx;
  color: #666666;
}

.label {
  margin-right: 6rpx;
  color: #9ca3af;
  font-size: 20rpx;
}

.signal-bar {
  width: 100rpx;
  height: 8rpx;
  background: #e5e7eb;
  border-radius: 4rpx;
  margin: 0 10rpx;
  overflow: hidden;
}

.signal-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50 0%, #8bc34a 100%);
  transition: width 0.3s;
}

.signal-fill.signal-excellent {
  background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
}

.signal-fill.signal-good {
  background: linear-gradient(90deg, #4ade80 0%, #22c55e 100%);
}

.signal-fill.signal-fair {
  background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);
}

.signal-fill.signal-weak {
  background: linear-gradient(90deg, #f87171 0%, #ef4444 100%);
}

.signal-text {
  margin-left: 6rpx;
  font-size: 20rpx;
  color: #9ca3af;
}

.value {
  color: #6b7280;
  font-size: 20rpx;
}

.device-action {
  color: #d1d5db;
  margin-left: 12rpx;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 60rpx 32rpx;
}

.empty-icon {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #ffffff;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 80rpx 32rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #ffffff;
  margin-top: 24rpx;
}

.footer {
  padding: 32rpx 0;
}
</style>
