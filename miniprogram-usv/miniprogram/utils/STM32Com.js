// 一些常量
var crcCal = require('crcCalc.js');
var JWDutils = require('WScoordinate.js');
var Instructions = []
var PI = 3.1415926535897932384626;
var Power = [0,0,0,0,0];
var Rudder = [0,0,0,0,0];
var ForceSetZPoint = [false,false,false,false,false];
var EnableManual =  [true,true,true,true,true];
var CalibINS =  [false,false,false,false,false];
var index = 0;

function GetTxBuf(shipid, power, rudder) {
    var arr = []
    var setpower = true;
    switch (index++)
    {
        case 0:
        case 2:
        case 4:
        case 6:
        case 8:
        break;
        case 1:
            shipid = 0;
            setpower = false;
        break;
        case 3:
            shipid = 1;
            setpower = false;
        break;
        case 5:
            shipid = 2;
            setpower = false;
        break;
        case 7:
            shipid = 3;
            setpower = false;
        break;
        case 9:
            shipid = 4;
            setpower = false;
        break;
        default:
            index = 0;
        break;
    }
    if (Power[shipid] == power && Rudder[shipid] == rudder && Instructions.length > 0)
    {
        for(let i = 0;i<Instructions[0].SendBuffer.length;i++)
        {
            arr.push(Instructions[0].SendBuffer[i])
        }
        var crc = Int16Array.of(crcCal.compute(arr,arr.length));
        arr.push(crc[0])
        arr.push(crc[0]>>8)
        Instructions[0].CRC = crc
        if( Instructions[0].retry++ > 5)
        {
            Instructions = Instructions.slice(1, Instructions.length);
        }
    }
    else
    {
        if (rudder < -100)
            rudder = -100
        if (rudder > 100)
            rudder = 100
        if (power < -100)
            power = -100
        if (power > 100)
            power = 100
        if(setpower)
        {
            Power[shipid] = power;
            Rudder[shipid] = rudder;
        }
       
        arr.push(shipid)//船舶ID
        arr.push(0)//功能码
        arr.push(Power[shipid])
        arr.push(Rudder[shipid] )
        var x = 0;
        if (ForceSetZPoint[shipid])
            x = x | 0x01
        if (EnableManual[shipid])
            x = x | 0x02
        x = x | 0x04
        if (CalibINS[shipid])
            x = x | 0x08
        ForceSetZPoint[shipid] = false;
        CalibINS[shipid] = false;
        arr.push(x)
        var crc = Int16Array.of(crcCal.compute(arr,arr.length));
        arr.push(crc[0])
        arr.push(crc[0]>>8)
    }
    return arr;
};

//增加点
function AddWayPoint(shipid, id,  lng, lat) {
    let result = JWDutils.gcj02ToWgs84(lng, lat)
    let lng1 = parseInt(result[0] * 1000000);
    let lat1 = parseInt(result[1] * 1000000);

    var x = [{
        SendBuffer:[
            shipid,//船舶ID
            4, //指令吗
            id & 0xff, (id >> 8 )& 0xff, 
            lng1 & 0xff , (lng1 >> 8 )& 0xff, (lng1 >> 16 )& 0xff, (lng1 >> 24)& 0xff,
            lat1 & 0xff , (lat1 >> 8 )& 0xff, (lat1 >> 16 )& 0xff, (lat1 >> 24)& 0xff,
         ],
        CRC:0,
      }];
      Instructions = Instructions.concat(x);
};
//开始更新点
function StartUpdateWayPoint(shipid) {
    var x = [{
        SendBuffer:[
            shipid,//船舶ID
            5, //指令吗
            0, 0, 
         ],
        CRC:0,
        retry:0,
      }];
      Instructions = Instructions.concat(x);
};
//更新点
function UpdateWayPoint(shipid, id,  lng, lat) {
    let result = JWDutils.gcj02ToWgs84(lng, lat)
    let lng1 = parseInt(result[0] * 1000000);
    let lat1 = parseInt(result[1] * 1000000);

    var x = [{
        SendBuffer:[
            shipid,//船舶ID
            6, //指令吗
            id & 0xff, (id >> 8 )& 0xff, 
            lng1 & 0xff , (lng1 >> 8 )& 0xff, (lng1 >> 16 )& 0xff, (lng1 >> 24)& 0xff,
            lat1 & 0xff , (lat1 >> 8 )& 0xff, (lat1 >> 16 )& 0xff, (lat1 >> 24)& 0xff,
         ],
        CRC:0,
        retry:0,
      }];
      Instructions = Instructions.concat(x);
};
//结束更新点
function EndUpdateWayPoint(shipid) {
    var x = [{
        SendBuffer:[
            shipid,//船舶ID
            7, //指令吗
            0, 0, 
         ],
        CRC:0,
        retry:0,
      }];
      Instructions = Instructions.concat(x);
};
//删除点
function DeleteWayPoint(shipid, id) {

    var x = [{
        SendBuffer:[
            shipid,//船舶ID
            8, //指令吗
            id & 0xff, (id >> 8 )& 0xff, 
         ],
        CRC:0,
        retry:0,
      }];
      Instructions = Instructions.concat(x);
};
//删除所有点
function DeleteAllWayPoint(shipid) {
    var x = [{
        SendBuffer:[
            shipid,//船舶ID
            9, //指令吗
            0, 0, 
         ],
        CRC:0,
        retry:0,
      }];
      Instructions = Instructions.concat(x);
};
//修改点
function ModifyWayPoint(shipid, id,  lng, lat) {
    let result = JWDutils.gcj02ToWgs84(lng, lat)
    let lng1 = parseInt(result[0] * 1000000);
    let lat1 = parseInt(result[1] * 1000000);
    var x = [{
        SendBuffer:[
            shipid,//船舶ID
            11, //指令吗
            id & 0xff, (id >> 8 )& 0xff, 
            lng1 & 0xff , (lng1 >> 8 )& 0xff, (lng1 >> 16 )& 0xff, (lng1 >> 24)& 0xff,
            lat1 & 0xff , (lat1 >> 8 )& 0xff, (lat1 >> 16 )& 0xff, (lat1 >> 24)& 0xff,
         ],
        CRC:0,
        retry:0,
      }];
      Instructions = Instructions.concat(x);
};

function RemoveInstruction(shipid, cmd, crc) {
    if(Instructions.length == 0)
        return;
    if(Instructions[0].CRC != crc)
        return;
    if(Instructions[0].SendBuffer[0] != shipid)
        return;
    if(Instructions[0].SendBuffer[1] != cmd)
        return;
    Instructions = Instructions.slice(1, Instructions.length);
};
function ClearInstructions() {
    Instructions = [];
};
function SetEnableManual(shipid, e) {
    EnableManual[shipid] = e;
}
function GetEnableManual(shipid) {
    var res = EnableManual[shipid];
    return res;
}
function SetForceSetZPoint(shipid) {
    ForceSetZPoint[shipid] = true;
}
function SetCalibINS(shipid) {
    CalibINS[shipid] = true;
}
function GetRealDistance(lng1, lat1, lng2, lat2 )
{
    var dis = 0.0;
    var radLat1 = lat1 * 3.1415926 / 180.0;
    var radLng1 = lng1 * 3.1415926 / 180.0;
    var radLat2 = lat2 * 3.1415926 / 180.0;
    var radLng2 = lng2 * 3.1415926 / 180.0;
    var a = radLat1 - radLat2;
    var b = radLng1 - radLng2;
    var dis = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2.0), 2.0))) * 6378137;
    return dis;
}

module.exports = {
    GetTxBuf: GetTxBuf,
    AddWayPoint: AddWayPoint,
    StartUpdateWayPoint: StartUpdateWayPoint,
    UpdateWayPoint: UpdateWayPoint,
    EndUpdateWayPoint: EndUpdateWayPoint,
    DeleteWayPoint: DeleteWayPoint,
    ModifyWayPoint: ModifyWayPoint,
    RemoveInstruction: RemoveInstruction,
    SetEnableManual: SetEnableManual,
    GetEnableManual:GetEnableManual,
    SetForceSetZPoint: SetForceSetZPoint,
    SetCalibINS:SetCalibINS,
    DeleteAllWayPoint: DeleteAllWayPoint,
    ClearInstructions: ClearInstructions,
    GetRealDistance: GetRealDistance,
}