class Instruction
{
    constructor() {
        this.SendBuffer = [];
        this.CRC = 0;
        this.Command = 0;
    }
    
    AddWayPoint(id, lng, lat)
    {
        SendBuffer= [];
        SendBuffer.Add(4);
        SendBuffer.Add(id & 0xff);
        SendBuffer.Add((id << 8 )& 0xff);
        var view = new DataView(0 | (lng * 1000000));
        SendBuffer.Add(view.getInt8(0));
    }
}