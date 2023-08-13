/**
  * MFRC522 Block
  * 目前来看，读UUID是一直可以读取的，但是读里面的数据，读了一次，就无法读第二次了
  * 所以，索性把这个插件简化，只有读取UUID的功能
  */
//% color="#275C6B" weight=100 icon="\uf2bb" block="MFRC522 RFID"
namespace MFRC522 {
    let COMMAND_I2C_ADDRESS = 0x28
    let Type2=0
    let TPrescalerReg = 0x2B
    let TxControlReg = 0x14
    let PICC_READ = 0x30
    let PICC_ANTICOLL = 0x93
    let PCD_RESETPHASE = 0x0F
    let temp = 0
    let uid: number[] = []

    let returnLen = 0
    let returnData:number[] = []
    let status = 0
    let u = 0
    let ChkSerNum = 0
    let PCD_IDLE = 0
    let d=0

    let Status2Reg = 0x08
    let CommandReg = 0x01
    let BitFramingReg = 0x0D
    let MAX_LEN = 16
    let PCD_AUTHENT = 0x0E
    let PCD_TRANSCEIVE = 0x0C
    let PICC_REQIDL = 0x26
    let PICC_AUTHENT1A = 0x60

    let ComIrqReg = 0x04
    let DivIrqReg = 0x05
    let FIFODataReg = 0x09
    let FIFOLevelReg = 0x0A
    let ControlReg = 0x0C

    function SetBits (reg: number, mask: number) {
        let tmp = I2C_Read(reg)
        I2C_Write(reg, (tmp|mask))
    }

    function I2C_Write (reg: number, val: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = val
        pins.i2cWriteBuffer(COMMAND_I2C_ADDRESS, buf)
    }

    function I2C_Read (reg: number) {
        pins.i2cWriteNumber(COMMAND_I2C_ADDRESS, reg, NumberFormat.UInt8BE);
        let val = pins.i2cReadNumber(COMMAND_I2C_ADDRESS, NumberFormat.UInt8BE);
        return val;
    }

    function ClearBits (reg: number, mask: number) {
        let tmp = I2C_Read(reg)
        I2C_Write(reg, tmp & (~mask))
    }

    function Request (reqMode: number):[number, any] {
        let Type:number[] = []
        I2C_Write(BitFramingReg, 0x07)
        Type.push(reqMode)
        let [status, returnData, returnBits] = MFRC522_ToCard(PCD_TRANSCEIVE, Type)

        if ((status != 0) || (returnBits != 16)) {
            status = 2
        }

        return [status, returnBits]
    }

    function AntennaON () {
        temp = I2C_Read(TxControlReg)
        if (~(temp & 0x03)) {
            SetBits(TxControlReg, 0x03)
        }
    }

    function AvoidColl ():[number,number[] ] {
        let SerNum = []
        ChkSerNum = 0
        I2C_Write(BitFramingReg, 0)
        SerNum.push(PICC_ANTICOLL)
        SerNum.push(0x20)
        let [status, returnData, returnBits] = MFRC522_ToCard(PCD_TRANSCEIVE, SerNum)

        if (status == 0) {
            if (returnData.length == 5) {
                for (let k = 0; k <= 3; k++) {
                    ChkSerNum = ChkSerNum ^ returnData[k]
                }
                if (ChkSerNum != returnData[4]) {
                    status = 2
                }
            }
            else {
                status = 2
            }
        }
        return [status, returnData]
    }

    function MFRC522_ToCard (command: number, sendData: number[]):[number, number[],number] {
        returnData = []
        returnLen = 0
        status = 2
        let irqEN = 0x00
        let waitIRQ = 0x00
        let lastBits = null
        let n = 0

        if (command == PCD_AUTHENT){
            irqEN = 0x12
            waitIRQ = 0x10
        }

        if (command == PCD_TRANSCEIVE){
            irqEN = 0x77
            waitIRQ = 0x30
        }

        I2C_Write(0x02, irqEN | 0x80)
        ClearBits(ComIrqReg, 0x80)
        SetBits(FIFOLevelReg, 0x80)
        I2C_Write(CommandReg, PCD_IDLE)

        for (let o=0;o<(sendData.length);o++){
            I2C_Write(FIFODataReg, sendData[o])
        }
        I2C_Write(CommandReg, command)

        if (command == PCD_TRANSCEIVE){
            SetBits(BitFramingReg, 0x80)
        }

        let p = 2000
        while (true){
            n = I2C_Read(ComIrqReg)
            p --
            if (~(p != 0 && ~(n & 0x01) && ~(n & waitIRQ))) {
                break
            }
        }
        ClearBits(BitFramingReg, 0x80)

        if (p != 0){
            if ((I2C_Read(0x06) & 0x1B) == 0x00){
                status = 0
                    if (n & irqEN & 0x01){
                    status = 1
                }
                if (command == PCD_TRANSCEIVE){
                    n = I2C_Read(FIFOLevelReg)
                    lastBits = I2C_Read(ControlReg) & 0x07
                    if (lastBits != 0){
                        returnLen = (n -1)*8+lastBits
                    }
                    else{
                        returnLen = n * 8
                    }
                    if (n == 0){
                        n = 1
                    }
                    if (n > MAX_LEN){
                        n = MAX_LEN
                    }
                    for (let q=0;q<n;q++){
                        returnData.push(I2C_Read(FIFODataReg))
                    }
                }
            }
            else{
                status = 2
            }
        }

        return [status, returnData, returnLen]
    }

    function getIDNum(uid: number[]){
        let a= 0

        for (let e=0;e<5;e++){
            a = a*256+uid[e]
        }
        return a
    }

    function readID() {
        [status, Type2] = Request(PICC_REQIDL)

        if (status != 0) {
            return null
        }
        [status, uid] = AvoidColl()

        if (status != 0) {
            return null
        }

        return getIDNum(uid)
    }

    /*
     * Initial setup
     */
    //% block="初始化RFID读卡器"
    //% weight=100
   export function Init() {
       // reset module
       I2C_Write(CommandReg, PCD_RESETPHASE)

       I2C_Write(0x2A, 0x8D)
       I2C_Write(0x2B, 0x3E)
       I2C_Write(0x2D, 30)
       I2C_Write(0x2E, 0)
       I2C_Write(0x15, 0x40)
       I2C_Write(0x11, 0x3D)
       AntennaON()
   }

   /*
    * Function to read ID from card
    * 这是一个阻塞式的函数，它会等在那边知道读到数据
    */
   //% block="阻塞式读取RFID卡的ID"
   //% weight=95
   export function getIDBlocking() {
       let id = readID()
       while (!(id)) {
           id = readID()
           if (id!=undefined){
               return id
           }
       }
       return id
   }

    /*
     * Function to read ID from card
     * 这是一个非阻塞式的函数，读到数据，就返回ID；读不到，就返回0
     */
    //% block="非阻塞式读取RFID卡的ID"
    //% weight=90
    export function getIDNonBlocking() {
        let id = readID()
        if (id == undefined) {
            return 0
        }
        return id
    }
}
