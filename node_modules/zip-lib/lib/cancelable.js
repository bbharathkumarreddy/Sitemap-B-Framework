"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Cancelable {
    /**
     *
     */
    constructor() {
        this.isCanceled = false;
    }
    cancel() {
        this.isCanceled = true;
    }
    /**
     * Ignore any other error if the `cancel` method has been called
     *
     * Error: EBADF: bad file descriptor, read
     * EBADF error may occur when calling the cancel method.
     * see https://travis-ci.org/fpsqdb/zip-lib/jobs/606040627#L124
     * @param error
     */
    wrapError(error) {
        if (this.isCanceled) {
            return this.canceledError();
        }
        return error;
    }
    /**
     * Returns an error that signals cancellation.
     */
    canceledError() {
        let error = new Error("Canceled");
        error.name = error.message;
        return error;
    }
}
exports.Cancelable = Cancelable;
//# sourceMappingURL=cancelable.js.map