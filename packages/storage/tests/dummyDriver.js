/* eslint-disable */

const dummyStorage = {};

// Config the localStorage backend, using options set in the config.
function _initStorage(options) {
  const self = this;

  const dbInfo = {};
  if (options) {
    for (const i in options) {
      dbInfo[i] = options[i];
    }
  }

  dummyStorage[dbInfo.name] = dbInfo.db = {};

  self._dbInfo = dbInfo;
  return Promise.resolve();
}

const SERIALIZED_MARKER = "__lfsc__:";
const SERIALIZED_MARKER_LENGTH = SERIALIZED_MARKER.length;

// OMG the serializations!
const TYPE_ARRAYBUFFER = "arbf";
const TYPE_BLOB = "blob";
const TYPE_INT8ARRAY = "si08";
const TYPE_UINT8ARRAY = "ui08";
const TYPE_UINT8CLAMPEDARRAY = "uic8";
const TYPE_INT16ARRAY = "si16";
const TYPE_INT32ARRAY = "si32";
const TYPE_UINT16ARRAY = "ur16";
const TYPE_UINT32ARRAY = "ui32";
const TYPE_FLOAT32ARRAY = "fl32";
const TYPE_FLOAT64ARRAY = "fl64";
const TYPE_SERIALIZED_MARKER_LENGTH =
  SERIALIZED_MARKER_LENGTH + TYPE_ARRAYBUFFER.length;

function clear(callback) {
  const self = this;
  const promise = new Promise((resolve, reject) => {
    self
      .ready()
      .then(() => {
        const { db } = self._dbInfo;

        for (const key in db) {
          if (db.hasOwnProperty(key)) {
            delete db[key];
            // db[key] = undefined;
          }
        }

        resolve();
      })
      .catch(reject);
  });

  executeCallback(promise, callback);
  return promise;
}

function getItem(key, callback) {
  const self = this;

  // Cast the key to a string, as that's all we can set as a key.
  if (typeof key !== "string") {
    window.console.warn(`${key} used as a key, but it is not a string.`);
    key = String(key);
  }

  const promise = new Promise((resolve, reject) => {
    self
      .ready()
      .then(() => {
        try {
          const { db } = self._dbInfo;
          let result = db[key];

          if (result) {
            result = _deserialize(result);
          }

          resolve(result);
        } catch (e) {
          reject(e);
        }
      })
      .catch(reject);
  });

  executeCallback(promise, callback);
  return promise;
}

function iterate(callback) {
  const self = this;

  const promise = new Promise((resolve, reject) => {
    self
      .ready()
      .then(() => {
        try {
          const { db } = self._dbInfo;

          for (const key in db) {
            let result = db[key];

            if (result) {
              result = _deserialize(result);
            }

            callback(result, key);
          }

          resolve();
        } catch (e) {
          reject(e);
        }
      })
      .catch(reject);
  });

  executeCallback(promise, callback);
  return promise;
}

function key(n, callback) {
  const self = this;
  const promise = new Promise((resolve, reject) => {
    self
      .ready()
      .then(() => {
        const { db } = self._dbInfo;
        let result = null;
        let index = 0;

        for (const key in db) {
          if (db.hasOwnProperty(key) && db[key] !== undefined) {
            if (n === index) {
              result = key;
              break;
            }
            index++;
          }
        }

        resolve(result);
      })
      .catch(reject);
  });

  executeCallback(promise, callback);
  return promise;
}

function keys(callback) {
  const self = this;
  const promise = new Promise((resolve, reject) => {
    self
      .ready()
      .then(() => {
        const { db } = self._dbInfo;
        const keys = [];

        for (const key in db) {
          if (db.hasOwnProperty(key)) {
            keys.push(key);
          }
        }

        resolve(keys);
      })
      .catch(reject);
  });

  executeCallback(promise, callback);
  return promise;
}

function length(callback) {
  const self = this;
  const promise = new Promise((resolve, reject) => {
    self
      .keys()
      .then((keys) => {
        resolve(keys.length);
      })
      .catch(reject);
  });

  executeCallback(promise, callback);
  return promise;
}

function removeItem(key, callback) {
  const self = this;

  // Cast the key to a string, as that's all we can set as a key.
  if (typeof key !== "string") {
    window.console.warn(`${key} used as a key, but it is not a string.`);
    key = String(key);
  }

  const promise = new Promise((resolve, reject) => {
    self
      .ready()
      .then(() => {
        const { db } = self._dbInfo;
        if (db.hasOwnProperty(key)) {
          delete db[key];
          // db[key] = undefined;
        }

        resolve();
      })
      .catch(reject);
  });

  executeCallback(promise, callback);
  return promise;
}

function setItem(key, value, callback) {
  const self = this;

  // Cast the key to a string, as that's all we can set as a key.
  if (typeof key !== "string") {
    window.console.warn(`${key} used as a key, but it is not a string.`);
    key = String(key);
  }

  const promise = new Promise((resolve, reject) => {
    self
      .ready()
      .then(() => {
        // Convert undefined values to null.
        // https://github.com/mozilla/localForage/pull/42
        if (value === undefined) {
          value = null;
        }

        // Save the original value to pass to the callback.
        const originalValue = value;

        _serialize(value, (value, error) => {
          if (error) {
            reject(error);
          } else {
            try {
              const { db } = self._dbInfo;
              db[key] = value;
              resolve(originalValue);
            } catch (e) {
              reject(e);
            }
          }
        });
      })
      .catch(reject);
  });

  executeCallback(promise, callback);
  return promise;
}

// _serialize just like in LocalStorage
function _serialize(value, callback) {
  let valueString = "";
  if (value) {
    valueString = value.toString();
  }

  // Cannot use `value instanceof ArrayBuffer` or such here, as these
  // checks fail when running the tests using casper.js...
  //
  // TODO: See why those tests fail and use a better solution.
  if (
    value &&
    (value.toString() === "[object ArrayBuffer]" ||
      (value.buffer && value.buffer.toString() === "[object ArrayBuffer]"))
  ) {
    // Convert binary arrays to a string and prefix the string with
    // a special marker.
    let buffer;
    let marker = SERIALIZED_MARKER;

    if (value instanceof ArrayBuffer) {
      buffer = value;
      marker += TYPE_ARRAYBUFFER;
    } else {
      buffer = value.buffer;

      if (valueString === "[object Int8Array]") {
        marker += TYPE_INT8ARRAY;
      } else if (valueString === "[object Uint8Array]") {
        marker += TYPE_UINT8ARRAY;
      } else if (valueString === "[object Uint8ClampedArray]") {
        marker += TYPE_UINT8CLAMPEDARRAY;
      } else if (valueString === "[object Int16Array]") {
        marker += TYPE_INT16ARRAY;
      } else if (valueString === "[object Uint16Array]") {
        marker += TYPE_UINT16ARRAY;
      } else if (valueString === "[object Int32Array]") {
        marker += TYPE_INT32ARRAY;
      } else if (valueString === "[object Uint32Array]") {
        marker += TYPE_UINT32ARRAY;
      } else if (valueString === "[object Float32Array]") {
        marker += TYPE_FLOAT32ARRAY;
      } else if (valueString === "[object Float64Array]") {
        marker += TYPE_FLOAT64ARRAY;
      } else {
        callback(new Error("Failed to get type for BinaryArray"));
      }
    }

    callback(marker + _bufferToString(buffer));
  } else if (valueString === "[object Blob]") {
    // Conver the blob to a binaryArray and then to a string.
    const fileReader = new FileReader();

    fileReader.onload = function () {
      const str = _bufferToString(this.result);

      callback(SERIALIZED_MARKER + TYPE_BLOB + str);
    };

    fileReader.readAsArrayBuffer(value);
  } else {
    try {
      callback(JSON.stringify(value));
    } catch (e) {
      window.console.error(
        "Couldn't convert value into a JSON " + "string: ",
        value,
      );

      callback(e);
    }
  }
}

// _deserialize just like in LocalStorage
function _deserialize(value) {
  // If we haven't marked this string as being specially serialized (i.e.
  // something other than serialized JSON), we can just return it and be
  // done with it.
  if (value.substring(0, SERIALIZED_MARKER_LENGTH) !== SERIALIZED_MARKER) {
    return JSON.parse(value);
  }

  // The following code deals with deserializing some kind of Blob or
  // TypedArray. First we separate out the type of data we're dealing
  // with from the data itself.
  const serializedString = value.substring(TYPE_SERIALIZED_MARKER_LENGTH);
  const type = value.substring(
    SERIALIZED_MARKER_LENGTH,
    TYPE_SERIALIZED_MARKER_LENGTH,
  );

  // Fill the string into a ArrayBuffer.
  // 2 bytes for each char.
  const buffer = new ArrayBuffer(serializedString.length * 2);
  const bufferView = new Uint16Array(buffer);
  for (let i = serializedString.length - 1; i >= 0; i--) {
    bufferView[i] = serializedString.charCodeAt(i);
  }

  // Return the right type based on the code/type set during
  // serialization.
  switch (type) {
    case TYPE_ARRAYBUFFER:
      return buffer;
    case TYPE_BLOB:
      return new Blob([buffer]);
    case TYPE_INT8ARRAY:
      return new Int8Array(buffer);
    case TYPE_UINT8ARRAY:
      return new Uint8Array(buffer);
    case TYPE_UINT8CLAMPEDARRAY:
      return new Uint8ClampedArray(buffer);
    case TYPE_INT16ARRAY:
      return new Int16Array(buffer);
    case TYPE_UINT16ARRAY:
      return new Uint16Array(buffer);
    case TYPE_INT32ARRAY:
      return new Int32Array(buffer);
    case TYPE_UINT32ARRAY:
      return new Uint32Array(buffer);
    case TYPE_FLOAT32ARRAY:
      return new Float32Array(buffer);
    case TYPE_FLOAT64ARRAY:
      return new Float64Array(buffer);
    default:
      throw new Error(`Unkown type: ${type}`);
  }
}

// _bufferToString just like in LocalStorage
function _bufferToString(buffer) {
  let str = "";
  const uint16Array = new Uint16Array(buffer);

  try {
    str = String.fromCharCode.apply(null, uint16Array);
  } catch (e) {
    // This is a fallback implementation in case the first one does
    // not work. This is required to get the phantomjs passing...
    for (let i = 0; i < uint16Array.length; i++) {
      str += String.fromCharCode(uint16Array[i]);
    }
  }

  return str;
}

function executeCallback(promise, callback) {
  if (callback) {
    promise.then(
      (result) => {
        callback(null, result);
      },
      (error) => {
        callback(error);
      },
    );
  }
}

const DummyDriverStorage = {
  _driver: "dummyStorageDriver",
  _initStorage,
  iterate,
  getItem,
  setItem,
  removeItem,
  clear,
  length,
  key,
  keys,
};
module.exports = DummyDriverStorage;
