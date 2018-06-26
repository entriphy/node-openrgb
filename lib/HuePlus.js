const util = require("./util");
const SerialPort = require("serialport");
const waitUntil = require("wait-until");
const modes = {
    fixed: 0x00,
    fading: 0x01,
    spectrum: 0x02,
    marquee: 0x03,
    coveringMarquee: 0x04,
    alternating: 0x05,
    pulse: 0x06,
    breathing: 0x07,
    candle: 0x09,
    wings: 0x0c,
    wave: 0x0d
}
let port;
let timeout = 50;

class HuePlus {
    constructor(serialPort) {
        let t = this;
        this.turnOnLED = turnOnLED;
        this.turnOffLED = turnOffLED;
        this.getLEDCount = getLEDCount;
        this.clear = clear;
        this.modes = modes;
        this.restoreDevice = restoreDevice;

        this.fixed = fixed;
        this.fading = fading;
        this.spectrum = spectrum;
        this.marquee = marquee;
        this.coveringMarquee = coveringMarquee;
        this.alternating = alternating;
        this.pulse = pulse;
        this.breathing = breathing;
        this.candle = candle;
        this.wings = wings;
        this.wave = wave;

        return new Promise((resolve, reject) => {
            if (typeof serialPort === "undefined") {
                console.log("Searching for NZXT HUE+...");
                SerialPort.list().then((list) => {
                    for (let i = 0; i < list.length; i++) {
                        if (list[i].vendorId.toLowerCase() === "04d8" && list[i].productId.toLowerCase() === "00df") {
                            port = new SerialPort(list[i].comName, { baudRate: 256000}, (err) => {
                                if (err) return reject("Could not find NZXT HUE+");
                                resolve(t);
                            });
                            break;
                        }
                    }
                })
            } else {
                port = new SerialPort(serialPort, (err) => {
                    if (err) return reject("Could not find NZXT HUE+");
                    resolve(t);
                });
            }
        })
    }
}

function fixed(color, channel, custom = false) {
    return changeColor(color, modes.fixed, channel, 0, 0, false, false, custom);
}

function fading(color, channel, speed = 3) {
    return changeColor(color, modes.fading, channel, speed)
}

function spectrum(channel, speed = 3) {
    return changeColor("ffffff", modes.spectrum, channel, speed);
}

function marquee(color, channel, speed = 3, size = 3, backwards = false) {
    return changeColor(color, modes.marquee, channel, speed, size, false, backwards);
}

function coveringMarquee(color, channel, speed = 3, backwards = false) {
    return changeColor(color, modes.coveringMarquee, channel, speed, 0, false, backwards);
}

function alternating(color, channel, speed = 3, size = 3, moving = false, backwards = false) {
    return changeColor(color, modes.alternating, channel, speed, size, moving, backwards);
}

function pulse(color, channel, speed = 3) {
    return changeColor(color, modes.pulse, channel, speed);
}

function breathing(color, channel, speed = 3, custom = false) {
    return changeColor(color, modes.breathing, channel, speed, 0, false, false, custom);
}

function candle(color, channel) {
    return changeColor(color, modes.candle, channel);
}

function wings(color, channel, speed = 3) {
    return changeColor(color, modes.wings, channel, speed);
}

function wave(color, channel, speed = 3) {
    return changeColor(color, modes.wave, channel, speed, 0, false, false, true);
}

function turnOnLED() {
    return new Promise((resolve, reject) => {
        let output = 0;
        port.write([0x46, 0x00, 0xc0, 0x00, 0x00, 0x00, 0xff]);
        port.on("data", (data) => {
            output = data.readUInt8();
        })
        waitUntil(timeout, 5, () => { return output === 1 }, (result) => {
            if (result) resolve(); else reject();
        });
    })
};

function turnOffLED() {
    return new Promise((resolve, reject) => {
        let output = 0;
        port.write(Buffer.from([0x46, 0x00, 0xc0, 0x00, 0x00, 0xff, 0x00]));
        port.on("data", (data) => {
            output = data.readUInt8();
        })
        waitUntil(timeout, 5, () => { return output === 1 }, (result) => {
            if (result) resolve(); else reject();
        });
    })

};

function clear() {
    return new Promise((resolve, reject) => {
        let output = 0;
        let buffer = [0x4b];
        for (let i = 0; i < 124; i++) {
            buffer.push(0x00);
        }
        port.write(Buffer.from(buffer));
        port.on("data", (data) => {
            output = data.readUInt8();
        })
        waitUntil(timeout, 5, () => { return output === 1 }, (result) => {
            if (result) resolve(); else reject();
        });
    })

}

function getLEDCount(channel) {
    return new Promise((resolve, reject) => {
        let output = [];
        port.write(Buffer.from([0x8d, channel]));
        port.on("data", (data) => {
            output.push(...data)
        });
        waitUntil(timeout, 5, () => { return output.length >= 5 }, (result) => {
            if (result) resolve(output[output.length - 1] /* i hate you */); else reject();
        });
    })
}

function changeColor(color, mode, channel, speed = 3, size = 3, moving = false, backwards = false, custom = false, i = 0) {
    if (typeof color !== "string" && typeof color !== "object") throw "Invalid color: use hex code (ex. #FFFFFF)";
    if (typeof color === "object" && color.length > 8 && !custom) throw "Max limit for color length is 8 for a noncustom mode";
    if (typeof mode !== "number") mode = modes[mode];
    if (typeof mode === "undefined") throw "Invalid mode";
    if (!custom && mode === modes.wave) throw "Wave mode is only available for custom presets";
    if (typeof channel !== "number" || channel < 0 || channel > 2) throw "Channel must an integer between 0 and 2";
    if (typeof speed !== "number" || speed < 0 || speed > 5) throw "Speed must be an integer between 1 and 5";
    if (typeof size !== "number" || size < 0 || size > 4) throw "Size must be an integer between 1 and 4";
    if (speed === 0) speed++; if (size === 0) size++;
    if (typeof moving !== "boolean") throw "Moving must be a boolean"
    if (typeof backwards !== "boolean") throw "Backwards must be a boolean";
    if (typeof custom !== "boolean") throw "Custom must be a boolean";

    if (typeof color !== "object" && mode === modes.alternating && color.length !== 2) throw "Color must be an array of 2 colors for Alternating mode";
    if (custom && (typeof color !== "object" || color.length !== 40)) throw "Color must be an array of 40 colors when using a custom preset";
    if (custom && (mode !== modes.fixed && mode !== modes.breathing && mode !== modes.wave)) throw "Custom preset is only allowed for Fixed, Breathing, and Wave modes";

    return new Promise((resolve, reject) => {
        getLEDCount(channel === 0 ? channel + 1 : channel).then((ledCount) => {
            let _ledCount = ledCount; // Keep original LED count
            if (ledCount > 0) ledCount--; // LED count starts at 0 ( ͡° ͜ʖ ͡°)
            if (custom) ledCount++; // LED Count gets incremented by 1 when using a custom preset
            speed -= 1; size -= 1; // Speed/size also starts at 0
            let buffer = [0x4b, channel, mode];
            
            switch (mode) {
                case modes.fixed:
                    buffer.push(ledCount, 0x02); // I don't know what the 0x02 is for, but NZXT's software uses it
                    break;
                case modes.fading:
                    buffer.push(ledCount, speed);
                    break;
                case modes.spectrum:
                    buffer.push((backwards ? ledCount + 10 : ledCount), speed);
                    break;
                case modes.marquee:
                    buffer.push((backwards ? ledCount + 10 : ledCount), speed + size * 8);
                    break;
                case modes.coveringMarquee:
                    buffer.push((backwards ? ledCount + 10 : ledCount), speed);
                    break;
                case modes.alternating:
                    let _ledCount = ledCount;
                    if (moving === true) _ledCount += 8;
                    buffer.push((backwards ? ledCount + 10 : ledCount), speed + size * 8);
                    break;
                case modes.pulse, modes.breathing:
                    buffer.push(ledCount, speed);
                    break;
                case modes.candle:
                    buffer.push(ledCount, 0x00);
                    break;
                case modes.wings, modes.wave:
                    buffer.push(ledCount, speed);
                    break;
            }

            buffer[4] += i * 0x20;
            
            if (mode === modes.spectrum) {
                for (let x = 0; x < _ledCount * 10; x++) {
                    buffer = buffer.concat([0x00, 0x00, 0xff]);
                }
            } else {
                for (let x = 0; x < _ledCount * 10; x++) {
                    console.log(color[x]);
                    if (custom) { buffer = buffer.concat(util.hexToGRB(color[x])); }
                    else { buffer = buffer.concat(util.hexToGRB( typeof color === "string" ? color : color[i] )); }
                }
            }

            if (_ledCount < 4) {
                for (let x = 0; x < 40 - (_ledCount) * 10; x++) {
                    buffer = buffer.concat([0x00, 0x00, 0x00]);
                }
            }

            if (buffer.length !== 125) return reject(`A malformed command was created (length: ${buffer.length}, must be 125)`); // Check if 

            let output = 0;
            port.write(buffer, (err) => {
                if (err) throw err;
            });
            port.once("data", (data) => {
                output = data.readUInt8();
            });

            waitUntil(timeout, 10, () => { return output === 1 }, (result) => {
                if (typeof color === "object" && i < color.length - 1) {
                    setTimeout(() => changeColor(color, mode, channel, ++speed, ++size, backwards, moving, ++i).then(resolve).catch(reject), timeout);
                }
                if (result) resolve(); else reject();
            });
        });
    })
}

module.exports = HuePlus;