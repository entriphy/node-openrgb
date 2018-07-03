class DeviceNotFound extends Error {
    constructor(err = "An unspecified device was not found") {
        super(err);
        this.name = "DeviceNotFound";
        this.message = err;
        Error.captureStackTrace(this, DeviceNotFound)
    }
}

module.exports = { DeviceNotFound };