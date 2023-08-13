# MakeCode Package for the Joy-IT SBC-RFID-RC522 RFID module (MFRC522).

我已经把它改造成IIC接口的microbit扩展，WS1850S这个读卡器工作正常

这里没有提供检测RFID卡的程序，而是提供了两个读取ID的程序，一个是阻塞式的，读到了ID才会执行下一步；一个是非阻塞式的，读一次，不管读没读到ID，程序都会继续执行下一步的代码

基于非阻塞式的读ID程序来实现检测卡的代码可以参考下面的截图。这么做的好处是，在检测到卡的时候，也拿到了ID，从而不需要再次读取ID，提高性能

<img width="678" alt="image" src="https://github.com/cspanjian/pxt-rfid-mfrc522/assets/58835905/bea50160-5b53-4804-99ed-56f575a93be6">

