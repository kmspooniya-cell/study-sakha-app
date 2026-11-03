function getTimeoutMs(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed >= 1000 && parsed <= 120000 ? parsed : fallback;
}

function createTimeoutError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

async function withAbortTimeout(operation, timeoutMs, timeoutCode) {
  const controller = new AbortController();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(createTimeoutError(timeoutCode));
    }, timeoutMs);

    Promise.resolve()
      .then(() => operation(controller.signal))
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      }, (error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function createTimeoutFetch(timeoutMs, timeoutCode) {
  return async (input, init = {}) => {
    const controller = new AbortController();
    let timer;
    const request = fetch(input, { ...init, signal: controller.signal });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(createTimeoutError(timeoutCode));
      }, timeoutMs);
    });

    try {
      return await Promise.race([request, timeout]);
    } finally {
      clearTimeout(timer);
    }
  };
}

module.exports = { createTimeoutFetch, getTimeoutMs, withAbortTimeout };
