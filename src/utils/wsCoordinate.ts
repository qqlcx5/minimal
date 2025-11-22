/**
 * 坐标转换工具
 * WGS-84、GCJ-02、BD-09 坐标系转换
 */

const PI = 3.1415926535897932384626
const X_PI = 3.14159265358979324 * 3000.0 / 180.0
const a = 6378245.0
const ee = 0.00669342162296594323

/**
 * 检测是否在国内
 */
function isOutofChina(lng: number, lat: number): boolean {
  return (lng < 72.004 || lng > 137.8347) || ((lat < 0.8293 || lat > 55.8271) || false)
}

/**
 * BD-09坐标转换为GCJ-02坐标
 */
export function bd09ToGcj02(lng: number, lat: number): [number, number] {
  const x = lng - 0.0065
  const y = lat - 0.006
  const magic = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI)
  const sqrtMagic = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI)
  const mgLng = sqrtMagic * Math.cos(magic)
  const mgLat = sqrtMagic * Math.sin(magic)
  return [mgLng, mgLat]
}

/**
 * GCJ-02坐标转换为BD-09坐标
 */
export function gcj02ToBd09(lng: number, lat: number): [number, number] {
  const magic = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * X_PI)
  const sqrtMagic = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * X_PI)
  const mgLng = sqrtMagic * Math.cos(magic) + 0.0065
  const mgLat = sqrtMagic * Math.sin(magic) + 0.006
  return [mgLng, mgLat]
}

/**
 * WGS-84坐标转换为GCJ-02坐标
 */
export function wgs84ToGcj02(lng: number, lat: number): [number, number] {
  if (isOutofChina(lng, lat)) {
    return [lng, lat]
  }
  const dlat = transformLat(lng - 105.0, lat - 35.0)
  const dlng = transformLng(lng - 105.0, lat - 35.0)
  const radlat = lat / 180.0 * PI
  let magic = Math.sin(radlat)
  magic = 1 - ee * magic * magic
  const sqrtmagic = Math.sqrt(magic)
  const dlatResult = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI)
  const dlngResult = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI)
  const mglat = parseFloat(String(lat)) + parseFloat(String(dlatResult))
  const mglng = parseFloat(String(lng)) + parseFloat(String(dlngResult))
  return [mglng, mglat]
}

/**
 * GCJ02-坐标转换为WGS-84坐标
 */
export function gcj02ToWgs84(lng: number, lat: number): [number, number] {
  if (isOutofChina(lng, lat)) {
    return [lng, lat]
  }
  const dlat = transformLat(lng - 105.0, lat - 35.0)
  const dlng = transformLng(lng - 105.0, lat - 35.0)
  const radlat = lat / 180.0 * PI
  let magic = Math.sin(radlat)
  magic = 1 - ee * magic * magic
  const sqrtmagic = Math.sqrt(magic)
  const dlatResult = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI)
  const dlngResult = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI)
  const mglat = parseFloat(String(lat)) + parseFloat(String(dlatResult))
  const mglng = parseFloat(String(lng)) + parseFloat(String(dlngResult))
  return [lng * 2 - mglng, lat * 2 - mglat]
}

/**
 * 转换经度
 */
function transformLng(lng: number, lat: number): number {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0
  return ret
}

/**
 * 转换纬度
 */
function transformLat(lng: number, lat: number): number {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))
  ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0
  return ret
}

/**
 * 计算两点间距离（米）
 */
export function getRealDistance(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const radLat1 = lat1 * 3.1415926 / 180.0
  const radLng1 = lng1 * 3.1415926 / 180.0
  const radLat2 = lat2 * 3.1415926 / 180.0
  const radLng2 = lng2 * 3.1415926 / 180.0
  const a = radLat1 - radLat2
  const b = radLng1 - radLng2
  const dis = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2.0), 2.0))) * 6378137
  return dis
}

