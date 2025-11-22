// 一些常量
var PI = 3.1415926535897932384626;
var X_PI = 3.14159265358979324 * 3000.0 / 180.0;
var a = 6378245.0;
var ee = 0.00669342162296594323;
// 检测是否在国内
function isOutofChina(lng, lat) {return (lng < 72.004 || lng > 137.8347) || ((lat < 0.8293 || lat > 55.8271) || false);
};// BD-09坐标转换为GCJ-02坐标
function bd09ToGcj02(lng, lat) {var x = lng - 0.0065;var y = lat - 0.006;var magic = Math.atan2(y, x) - 0.000003 * Math.cos(x * X_PI);var sqrtMagic = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * X_PI);var mgLng = sqrtMagic * Math.cos(magic);var mgLat = sqrtMagic * Math.sin(magic);return [mgLng, mgLat]
};
// GCJ-02坐标转换为BD-09坐标
function gcj02ToBd09(lng, lat) {var magic = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * X_PI);var sqrtMagic = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * X_PI);var mgLng = sqrtMagic * Math.cos(magic) + 0.0065;var mgLat = sqrtMagic * Math.sin(magic) + 0.006;return [mgLng, mgLat]
};
// WGS-84坐标转换为GCJ-02坐标
function wgs84ToGcj02(lng, lat) {if (isOutofChina(lng, lat)) {return [lng, lat]} else {var dlat = transformLat(lng - 105.0, lat - 35.0);var dlng = transformLng(lng - 105.0, lat - 35.0);var radlat = lat / 180.0 * PI;var magic = Math.sin(radlat);magic = 1 - ee * magic * magic;var sqrtmagic = Math.sqrt(magic);dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);var mglat = parseFloat(lat) + parseFloat(dlat);var mglng = parseFloat(lng) + parseFloat(dlng);return [mglng, mglat]}
};
// GCJ02-坐标转换为WGS-84坐标
function gcj02ToWgs84(lng, lat) {if (isOutofChina(lng, lat)) {return [lng, lat]} else {var dlat = transformLat(lng - 105.0, lat - 35.0);var dlng = transformLng(lng - 105.0, lat - 35.0);var radlat = lat / 180.0 * PI;var magic = Math.sin(radlat);magic = 1 - ee * magic * magic;var sqrtmagic = Math.sqrt(magic);dlat = (dlat * 180.0) / ((a * (1 - ee)) / (magic * sqrtmagic) * PI);dlng = (dlng * 180.0) / (a / sqrtmagic * Math.cos(radlat) * PI);var mglat = parseFloat(lat) + parseFloat(dlat);var mglng = parseFloat(lng) + parseFloat(dlng);return [lng * 2 - mglng, lat * 2 - mglat]}
};
// 转换经度
function transformLng(lng, lat) {var ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;return ret
}
// 转换纬度
function transformLat(lng, lat) {var ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;return ret
}
module.exports = {bd09ToGcj02: bd09ToGcj02,gcj02ToBd09: gcj02ToBd09,wgs84ToGcj02: wgs84ToGcj02,gcj02ToWgs84: gcj02ToWgs84
}