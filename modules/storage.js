/* global browser */

async function set(id, value) {
  if (typeof id !== "string") {
    throw "Error: value for parameter id must be of type string";
  }
  let obj = {};
  obj[id] = value;
  return browser.storage.local.set(obj);
}

async function get(type, id, fallback) {
  if (typeof id !== "string") {
    throw "Error: value for parameter id must be of type string";
  }
  const tmp = await browser.storage.local.get(id);
  return typeof tmp[id] === type ? tmp[id] : fallback;
}

export { set, get };
