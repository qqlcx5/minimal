<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useUsvStore } from '@/store/usv'
import type { BluetoothDevice } from '@/types/bluetooth'

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

  uni.createBLEConnection({
    deviceId,
    success: () => {
      console.log('蓝牙连接成功')
      connected.value = true
      connecting.value = false
      uni.navigateTo({
        url: `/pages/map/index?connectedDeviceId=${deviceId}&connectedDevicename=${encodeURIComponent(name)}`,
      })
    },
    fail: (err) => {
      console.error('蓝牙连接失败:', err)
      connecting.value = false
      uni.showToast({
        title: '连接失败',
        icon: 'none',
      })
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
        @click="createBLEConnection(device)"
      >
        <view class="device-icon">
          <wd-icon name="bluetooth" size="24px" />
        </view>
        <view class="device-info">
          <view class="device-name">
            {{ device.name || device.localName || '未知设备' }}
          </view>
          <view class="device-details">
            <view class="detail-item">
              <text class="label">信号强度:</text>
              <view class="signal-bar">
                <view
                  class="signal-fill"
                  :style="{ width: `${getRssiPercent(device.RSSI)}%` }"
                />
              </view>
              <text class="value">{{ device.RSSI }}dBm</text>
            </view>
            <view class="detail-item">
              <text class="label">UUID:</text>
              <text class="value">{{ device.deviceId.substring(0, 20) }}...</text>
            </view>
            <view
              v-if="device.advertisServiceUUIDs"
              class="detail-item"
            >
              <text class="label">服务数量:</text>
              <text class="value">{{ device.advertisServiceUUIDs.length }}</text>
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
  min-height: 100vh;
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
  padding: 32rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.device-item:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}

.device-icon {
  width: 80rpx;
  height: 80rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 24rpx;
  color: #ffffff;
}

.device-info {
  flex: 1;
}

.device-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 16rpx;
}

.device-details {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.detail-item {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #666666;
}

.label {
  margin-right: 8rpx;
}

.signal-bar {
  width: 120rpx;
  height: 8rpx;
  background: #e0e0e0;
  border-radius: 4rpx;
  margin: 0 16rpx;
  overflow: hidden;
}

.signal-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50 0%, #8bc34a 100%);
  transition: width 0.3s;
}

.value {
  color: #999999;
}

.device-action {
  color: #999999;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 80rpx 32rpx;
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
  padding-top: 32rpx;
}
</style>

