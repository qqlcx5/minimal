/**
 * USV 全局状态管理
 */

import { defineStore } from 'pinia'
import type { ShipState, CrossMarker, WayPoint, MapMarker } from '@/types/usv'

/**
 * USV Store
 */
export const useUsvStore = defineStore('usv', {
  state: () => ({
    // 蓝牙服务 UUID
    bleserviceuuid: [
      '0000FFE0-0000-1000-8000-00805F9B34FB',
      '00001000-0000-1000-8000-00805F9B34FB',
    ],
    // 蓝牙发送 UUID
    bletxuuid: [
      '0000FFE1-0000-1000-8000-00805F9B34FB',
      '00001001-0000-1000-8000-00805F9B34FB',
    ],
    // 观察模式
    Observe: false,
    // 使用加速度计
    userAccelerometer: false,
    // 十字标记
    crossmarker: [
      {
        id: 99999,
        width: 25,
        height: 25,
        anchor: { x: 0.5, y: 0.5 },
        latitude: 24.5945,
        longitude: 118.0835,
        iconPath: '/static/images/cross.png',
        zindex: 0,
        mapscale: 10,
      },
    ] as CrossMarker[],
    // 船舶数据（5 艘）
    ships: [
      {
        power: 0,
        rudder: 0,
        waypoints: [],
        points: [],
        ship: {
          id: 99998,
          width: 30,
          height: 30,
          anchor: { x: 0.5, y: 0.5 },
          latitude: 24.5945,
          longitude: 118.0835,
          rotate: 90,
          iconPath: '/static/images/ship0.png',
        },
        plos: {
          id: 99997,
          width: 10,
          height: 10,
          anchor: { x: 0.5, y: 1 },
          latitude: 24.5945,
          longitude: 118.0835,
          rotate: 0,
          iconPath: '/static/images/plosmark.png',
        },
      },
      {
        power: 0,
        rudder: 0,
        waypoints: [],
        points: [],
        ship: {
          id: 99996,
          width: 30,
          height: 30,
          anchor: { x: 0.5, y: 0.5 },
          latitude: 0,
          longitude: 0,
          rotate: 90,
          iconPath: '/static/images/ship1.png',
        },
        plos: {
          id: 99995,
          width: 10,
          height: 10,
          anchor: { x: 0.5, y: 1 },
          latitude: 0,
          longitude: 0,
          rotate: 0,
          iconPath: '/static/images/plosmark.png',
        },
      },
      {
        power: 0,
        rudder: 0,
        waypoints: [],
        points: [],
        ship: {
          id: 99994,
          width: 30,
          height: 30,
          anchor: { x: 0.5, y: 0.5 },
          latitude: 0,
          longitude: 0,
          rotate: 90,
          iconPath: '/static/images/ship2.png',
        },
        plos: {
          id: 99993,
          width: 10,
          height: 10,
          anchor: { x: 0.5, y: 1 },
          latitude: 0,
          longitude: 0,
          rotate: 0,
          iconPath: '/static/images/plosmark.png',
        },
      },
      {
        power: 0,
        rudder: 0,
        waypoints: [],
        points: [],
        ship: {
          id: 99991,
          width: 30,
          height: 30,
          anchor: { x: 0.5, y: 0.5 },
          latitude: 0,
          longitude: 0,
          rotate: 90,
          iconPath: '/static/images/ship3.png',
        },
        plos: {
          id: 99991,
          width: 10,
          height: 10,
          anchor: { x: 0.5, y: 1 },
          latitude: 0,
          longitude: 0,
          rotate: 0,
          iconPath: '/static/images/plosmark.png',
        },
      },
      {
        power: 0,
        rudder: 0,
        waypoints: [],
        points: [],
        ship: {
          id: 99990,
          width: 30,
          height: 30,
          anchor: { x: 0.5, y: 0.5 },
          latitude: 0,
          longitude: 0,
          rotate: 90,
          iconPath: '/static/images/ship4.png',
        },
        plos: {
          id: 99989,
          width: 10,
          height: 10,
          anchor: { x: 0.5, y: 1 },
          latitude: 0,
          longitude: 0,
          rotate: 0,
          iconPath: '/static/images/plosmark.png',
        },
      },
    ] as ShipState[],
  }),

  getters: {
    /**
     * 获取指定船舶状态
     */
    getShipById: (state) => {
      return (shipId: number): ShipState | undefined => {
        return state.ships[shipId]
      }
    },

    /**
     * 获取十字标记
     */
    getCrossMarker: (state): CrossMarker => {
      return state.crossmarker[0]
    },
  },

  actions: {
    /**
     * 初始化数据（从本地存储加载）
     */
    initFromStorage() {
      try {
        const ships = uni.getStorageSync('ships')
        if (ships) {
          this.ships = ships
          // 重置船舶状态
          this.ships.forEach((sp) => {
            sp.power = 0
            sp.rudder = 0
            sp.ship.latitude = 0
            sp.ship.longitude = 0
            sp.points = []
            sp.waypoints.forEach((item) => {
              item.selected = false
            })
          })
          // 设置船舶图标路径
          this.ships[0].ship.iconPath = '/static/images/ship0.png'
          this.ships[1].ship.iconPath = '/static/images/ship1.png'
          this.ships[2].ship.iconPath = '/static/images/ship2.png'
          this.ships[3].ship.iconPath = '/static/images/ship3.png'
          this.ships[4].ship.iconPath = '/static/images/ship4.png'
        }

        const userAccelerometer = uni.getStorageSync('userAccelerometer')
        if (userAccelerometer !== undefined) {
          this.userAccelerometer = userAccelerometer
        }

        const crossmarker = uni.getStorageSync('crossmarker')
        if (crossmarker) {
          this.crossmarker = crossmarker
        }
      }
      catch (error) {
        console.error('初始化存储数据失败:', error)
      }
    },

    /**
     * 保存船舶数据到本地存储
     */
    saveShipsToStorage() {
      try {
        uni.setStorageSync('ships', this.ships)
      }
      catch (error) {
        console.error('保存船舶数据失败:', error)
      }
    },

    /**
     * 保存加速度计设置到本地存储
     */
    saveUserAccelerometerToStorage() {
      try {
        uni.setStorageSync('userAccelerometer', this.userAccelerometer)
      }
      catch (error) {
        console.error('保存加速度计设置失败:', error)
      }
    },

    /**
     * 保存十字标记到本地存储
     */
    saveCrossMarkerToStorage() {
      try {
        uni.setStorageSync('crossmarker', this.crossmarker)
      }
      catch (error) {
        console.error('保存十字标记失败:', error)
      }
    },

    /**
     * 设置加速度计开关
     */
    setUserAccelerometer(value: boolean) {
      this.userAccelerometer = value
      this.saveUserAccelerometerToStorage()
    },

    /**
     * 更新船舶位置
     */
    updateShipPosition(shipId: number, latitude: number, longitude: number, rotate: number) {
      if (this.ships[shipId]) {
        this.ships[shipId].ship.latitude = latitude
        this.ships[shipId].ship.longitude = longitude
        this.ships[shipId].ship.rotate = rotate
      }
    },

    /**
     * 添加航点
     */
    addWayPoint(shipId: number, waypoint: WayPoint) {
      if (this.ships[shipId]) {
        this.ships[shipId].waypoints.push(waypoint)
        this.saveShipsToStorage()
      }
    },

    /**
     * 删除航点
     */
    deleteWayPoint(shipId: number, waypointId: number) {
      if (this.ships[shipId]) {
        const index = this.ships[shipId].waypoints.findIndex(wp => wp.id === waypointId)
        if (index !== -1) {
          this.ships[shipId].waypoints.splice(index, 1)
          this.saveShipsToStorage()
        }
      }
    },

    /**
     * 删除所有航点
     */
    deleteAllWayPoints(shipId: number) {
      if (this.ships[shipId]) {
        this.ships[shipId].waypoints = []
        this.saveShipsToStorage()
      }
    },

    /**
     * 更新航点位置
     */
    updateWayPointPosition(shipId: number, waypointId: number, latitude: number, longitude: number) {
      if (this.ships[shipId]) {
        const waypoint = this.ships[shipId].waypoints.find(wp => wp.id === waypointId)
        if (waypoint) {
          waypoint.latitude = latitude
          waypoint.longitude = longitude
          this.saveShipsToStorage()
        }
      }
    },

    /**
     * 更新十字标记位置和缩放
     */
    updateCrossMarker(latitude: number, longitude: number, mapscale?: number) {
      if (this.crossmarker[0]) {
        this.crossmarker[0].latitude = latitude
        this.crossmarker[0].longitude = longitude
        if (mapscale !== undefined) {
          this.crossmarker[0].mapscale = mapscale
        }
        this.saveCrossMarkerToStorage()
      }
    },
  },

  persist: {
    key: 'usv-store',
    storage: {
      getItem: (key: string) => {
        return uni.getStorageSync(key)
      },
      setItem: (key: string, value: any) => {
        uni.setStorageSync(key, value)
      },
    },
    paths: ['userAccelerometer', 'crossmarker'],
  },
})

