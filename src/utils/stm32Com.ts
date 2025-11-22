/**
 * STM32 通信协议处理
 */

import { compute } from './crcCalc'
import { gcj02ToWgs84, getRealDistance } from './wsCoordinate'

/**
 * 指令接口
 */
interface Instruction {
  SendBuffer: number[]
  CRC: number
  retry?: number
}

let Instructions: Instruction[] = []
let Power = [0, 0, 0, 0, 0]
let Rudder = [0, 0, 0, 0, 0]
let ForceSetZPoint = [false, false, false, false, false]
let EnableManual = [true, true, true, true, true]
let CalibINS = [false, false, false, false, false]
let index = 0

/**
 * 获取发送缓冲区
 */
export function getTxBuf(shipid: number, power: number, rudder: number): number[] {
  const arr: number[] = []
  let setpower = true
  switch (index++) {
    case 0:
    case 2:
    case 4:
    case 6:
    case 8:
      break
    case 1:
      shipid = 0
      setpower = false
      break
    case 3:
      shipid = 1
      setpower = false
      break
    case 5:
      shipid = 2
      setpower = false
      break
    case 7:
      shipid = 3
      setpower = false
      break
    case 9:
      shipid = 4
      setpower = false
      break
    default:
      index = 0
      break
  }
  if (Power[shipid] === power && Rudder[shipid] === rudder && Instructions.length > 0) {
    for (let i = 0; i < Instructions[0].SendBuffer.length; i++) {
      arr.push(Instructions[0].SendBuffer[i])
    }
    const crc = Int16Array.of(compute(arr, arr.length))
    arr.push(crc[0])
    arr.push(crc[0] >> 8)
    Instructions[0].CRC = crc[0]
    if (Instructions[0].retry && Instructions[0].retry++ > 5) {
      Instructions = Instructions.slice(1, Instructions.length)
    }
  }
  else {
    let clampedRudder = rudder
    if (rudder < -100) {
      clampedRudder = -100
    }
    if (rudder > 100) {
      clampedRudder = 100
    }
    let clampedPower = power
    if (power < -100) {
      clampedPower = -100
    }
    if (power > 100) {
      clampedPower = 100
    }
    if (setpower) {
      Power[shipid] = clampedPower
      Rudder[shipid] = clampedRudder
    }

    arr.push(shipid) // 船舶ID
    arr.push(0) // 功能码
    arr.push(Power[shipid])
    arr.push(Rudder[shipid])
    let x = 0
    if (ForceSetZPoint[shipid]) {
      x = x | 0x01
    }
    if (EnableManual[shipid]) {
      x = x | 0x02
    }
    x = x | 0x04
    if (CalibINS[shipid]) {
      x = x | 0x08
    }
    ForceSetZPoint[shipid] = false
    CalibINS[shipid] = false
    arr.push(x)
    const crc = Int16Array.of(compute(arr, arr.length))
    arr.push(crc[0])
    arr.push(crc[0] >> 8)
  }
  return arr
}

/**
 * 增加航点
 */
export function addWayPoint(shipid: number, id: number, lng: number, lat: number): void {
  const result = gcj02ToWgs84(lng, lat)
  const lng1 = parseInt(String(result[0] * 1000000))
  const lat1 = parseInt(String(result[1] * 1000000))

  const x: Instruction = {
    SendBuffer: [
      shipid, // 船舶ID
      4, // 指令码
      id & 0xff, (id >> 8) & 0xff,
      lng1 & 0xff, (lng1 >> 8) & 0xff, (lng1 >> 16) & 0xff, (lng1 >> 24) & 0xff,
      lat1 & 0xff, (lat1 >> 8) & 0xff, (lat1 >> 16) & 0xff, (lat1 >> 24) & 0xff,
    ],
    CRC: 0,
  }
  Instructions = Instructions.concat(x)
}

/**
 * 开始更新航点
 */
export function startUpdateWayPoint(shipid: number): void {
  const x: Instruction = {
    SendBuffer: [
      shipid, // 船舶ID
      5, // 指令码
      0, 0,
    ],
    CRC: 0,
    retry: 0,
  }
  Instructions = Instructions.concat(x)
}

/**
 * 更新航点
 */
export function updateWayPoint(shipid: number, id: number, lng: number, lat: number): void {
  const result = gcj02ToWgs84(lng, lat)
  const lng1 = parseInt(String(result[0] * 1000000))
  const lat1 = parseInt(String(result[1] * 1000000))

  const x: Instruction = {
    SendBuffer: [
      shipid, // 船舶ID
      6, // 指令码
      id & 0xff, (id >> 8) & 0xff,
      lng1 & 0xff, (lng1 >> 8) & 0xff, (lng1 >> 16) & 0xff, (lng1 >> 24) & 0xff,
      lat1 & 0xff, (lat1 >> 8) & 0xff, (lat1 >> 16) & 0xff, (lat1 >> 24) & 0xff,
    ],
    CRC: 0,
    retry: 0,
  }
  Instructions = Instructions.concat(x)
}

/**
 * 结束更新航点
 */
export function endUpdateWayPoint(shipid: number): void {
  const x: Instruction = {
    SendBuffer: [
      shipid, // 船舶ID
      7, // 指令码
      0, 0,
    ],
    CRC: 0,
    retry: 0,
  }
  Instructions = Instructions.concat(x)
}

/**
 * 删除航点
 */
export function deleteWayPoint(shipid: number, id: number): void {
  const x: Instruction = {
    SendBuffer: [
      shipid, // 船舶ID
      8, // 指令码
      id & 0xff, (id >> 8) & 0xff,
    ],
    CRC: 0,
    retry: 0,
  }
  Instructions = Instructions.concat(x)
}

/**
 * 删除所有航点
 */
export function deleteAllWayPoint(shipid: number): void {
  const x: Instruction = {
    SendBuffer: [
      shipid, // 船舶ID
      9, // 指令码
      0, 0,
    ],
    CRC: 0,
    retry: 0,
  }
  Instructions = Instructions.concat(x)
}

/**
 * 修改航点
 */
export function modifyWayPoint(shipid: number, id: number, lng: number, lat: number): void {
  const result = gcj02ToWgs84(lng, lat)
  const lng1 = parseInt(String(result[0] * 1000000))
  const lat1 = parseInt(String(result[1] * 1000000))
  const x: Instruction = {
    SendBuffer: [
      shipid, // 船舶ID
      11, // 指令码
      id & 0xff, (id >> 8) & 0xff,
      lng1 & 0xff, (lng1 >> 8) & 0xff, (lng1 >> 16) & 0xff, (lng1 >> 24) & 0xff,
      lat1 & 0xff, (lat1 >> 8) & 0xff, (lat1 >> 16) & 0xff, (lat1 >> 24) & 0xff,
    ],
    CRC: 0,
    retry: 0,
  }
  Instructions = Instructions.concat(x)
}

/**
 * 移除指令
 */
export function removeInstruction(shipid: number, cmd: number, crc: number): void {
  if (Instructions.length === 0) {
    return
  }
  if (Instructions[0].CRC !== crc) {
    return
  }
  if (Instructions[0].SendBuffer[0] !== shipid) {
    return
  }
  if (Instructions[0].SendBuffer[1] !== cmd) {
    return
  }
  Instructions = Instructions.slice(1, Instructions.length)
}

/**
 * 清除所有指令
 */
export function clearInstructions(): void {
  Instructions = []
}

/**
 * 设置手动模式
 */
export function setEnableManual(shipid: number, e: boolean): void {
  EnableManual[shipid] = e
}

/**
 * 获取手动模式状态
 */
export function getEnableManual(shipid: number): boolean {
  return EnableManual[shipid]
}

/**
 * 设置强制设置零点
 */
export function setForceSetZPoint(shipid: number): void {
  ForceSetZPoint[shipid] = true
}

/**
 * 设置标定磁力计
 */
export function setCalibINS(shipid: number): void {
  CalibINS[shipid] = true
}

/**
 * 获取真实距离（已迁移到 wsCoordinate.ts，保留以兼容旧代码）
 */
export { getRealDistance }

