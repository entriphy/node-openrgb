const HID = require("node-hid");
const util = require("./util");
const events = require("events");
const eventEmitter = new events.EventEmitter();
const DeviceNotFound = require("./ErrorTypes").DeviceNotFound;
let SmartDevice; // Global variable for the Smart Device unit
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

class NZXT_SmartDevice {
    constructor() {
        this.modes = modes;
        this.rpm = [0, 0, 0]
        this.on = on;
        
        this.changeColor = changeColor;
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
        this.setFanSpeed = setFanSpeed;

        return new Promise((resolve, reject) => {
            let deviceDetected = false;
            try {
                const devices = HID.devices();
                devices.forEach((device) => {
                    if (device.vendorId === 0x1e71 && device.productId === 0x1714) {
                        SmartDevice = new HID.HID(device.path);
                        deviceDetected = true;
                        resolve(this);
                    }
                });
                if (!deviceDetected) reject(new DeviceNotFound("Could not find the NZXT Smart Device."));
            } catch (e) {
                reject(e);
            }
        })
    }
    get HID() {
        return SmartDevice;
    }
}

function changeColor(color, mode, speed = 3, size = 3, moving = false, backwards = false, custom = false, i = 0) {
    if (typeof color !== "string" && typeof color !== "object") return new TypeError("Invalid color: use hex code (ex. #FFFFFF)");
    if (typeof color === "object" && color.length > 8 && !custom) return new "Max limit for color length is 8 for a noncustom mode";
    if (mode === "spectrum") color = "#0000ff"
    if (typeof mode !== "number") mode = modes[mode];
    if (typeof mode === "undefined" || (!Object.keys(modes).includes(mode) && !Object.values(modes).includes(mode))) return new TypeError("Invalid mode");
    if (!custom && mode === modes.wave) return RangeMode("Wave mode is only available for custom presets");
    if (typeof speed !== "number" || speed < 0 || speed > 5) return new TypeError("Speed must be an integer between 1 and 5");
    if (typeof size !== "number" || size < 0 || size > 4) return new TypeError("Size must be an integer between 1 and 4");
    if (speed === 0) speed++; if (size === 0) size++;
    if (typeof moving !== "boolean") return new TypeError("Moving must be a boolean");
    if (typeof backwards !== "boolean") return new TypeError("Backwards must be a boolean");
    if (typeof custom !== "boolean") return new TypeError("Custom must be a boolean");
    if (typeof color !== "object" && mode === modes.alternating && color.length !== 2) return new RangeError("Color must be an array of 2 colors for Alternating mode");
    if (custom && (typeof color !== "object" || color.length !== 40)) return new RangeError("Color must be an array of 40 colors when using a custom preset");
    if (custom && (!["fixed", "breathing", "wave"].includes(mode))) return new TypeError("Custom preset is only allowed for Fixed, Breathing, and Wave modes");
    speed -= 1; size -= 1; // Speed/size starts at 0

    let colors = [];
    if (!custom) {
        for (let x = 0; x < 40; x++) {
            colors = colors.concat(util.hexToGRB(typeof color === "string" ? color : color[i]));
        }
    } else colors = color;
    
    let buffer = [0x02, 0x4b, mode, backwards ? 0x10 : 0x00, i * 0x20 + speed + size * 8 + (mode === "fixed" ? 0x02 : 0)].concat(colors);
    let buffer2 = [0x03].concat(colors).concat(util.hexToGRB(typeof color === "string" ? color : color[i])).concat([0x00]); // I have no idea what this is for, but NZXT CAM does it
    if (buffer.length !== 125 || buffer2.length !== 125) return new Error("lol");
    
    SmartDevice.write(buffer);
    SmartDevice.write(buffer2);

    if (typeof color === "object" && !custom && i < color.length - 1) {
        changeColor(color, mode, ++speed, ++size, backwards, moving, custom, ++i);
    }
}

function fixed(color, custom = false) {
    changeColor(color, modes.fixed, 0, 0, false, false, custom);
}

function fading(color, speed = 3) {
    changeColor(color, modes.fading, speed);
}

function spectrum(speed = 3, backwards = false) {
    changeColor("ffffff", modes.spectrum, speed, 0, false, backwards);
}

function marquee(color, speed = 3, size = 3, backwards = false) {
    changeColor(color, modes.marquee, speed, size, false, backwards);
}

function coveringMarquee(color, speed = 3, backwards = false) {
    changeColor(color, modes.coveringMarquee, speed, 0, false, backwards);
}

function alternating(color, speed = 3, size = 3, moving = false, backwards = false) {
    changeColor(color, modes.alternating, speed, size, moving, backwards);
}

function pulse(color, speed = 3) {
    changeColor(color, modes.pulse, speed);
}

function breathing(color, speed = 3, custom = false) {
    changeColor(color, modes.breathing, speed, 0, false, false, custom);
}

function candle(color) {
    changeColor(color, modes.candle);
}

function wings(color, speed = 3) {
    changeColor(color, modes.wings, speed);
}

function wave(color, speed = 3) {
    changeColor(color, modes.wave, speed, 0, false, false, true);
}

function on(event, cb) {
    if (event === "rpmChange") {
        SmartDevice.on("data", (data) => {
            if (data[0] === 4) {
                let fan;
                if (data[15] === 2) fan = 1; else if (data[15] === 17) fan = 2; else if (data[15] === 33) fan = 3;
                let currentRpm = parseInt("0x" + util.decimalToHexString(data[3]) + util.decimalToHexString(data[4]));
                // NZXT_SmartDevice.rpm[fan - 1] = currentRpm;
                cb([fan, currentRpm]);
            }
        });
    }
}

function setFanSpeed(fan, percent) {
    if (fan < 0 || fan > 3) return new RangeError("Fan must be a value between 1 and 3 (0 to control all 3 fans).");
    if (percent < 0 || percent > 100) return new RangeError("Percent must be a value between 0 and 100.");
    if (fan === 0) {
        for (let i = 0; i < 3; i ++) {
            let buffer = [0x02, 0x4d, i, 0x00, percent].concat(Array(60).fill(0x00));
            SmartDevice.write(buffer);
        }
    } else {
        let buffer = [0x02, 0x4d, fan - 1, 0x00, percent].concat(Array(60).fill(0x00));
        SmartDevice.write(buffer);
    }
}

module.exports = NZXT_SmartDevice;
