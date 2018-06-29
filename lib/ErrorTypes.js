module.exports = {
    DeviceNotFound: class extends Error {
        constructor(err = "An unspecified device was not found") {
            super(err);
            this.name = "DeviceNotFound";
            this.message = err;
            Error.captureStackTrace(this, DeviceNotFound)
        }
    }
}