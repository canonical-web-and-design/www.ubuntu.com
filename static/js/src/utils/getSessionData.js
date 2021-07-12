export function getSessionData(key) {
  const keyValue = localStorage.getItem(key);

  if (keyValue) {
    if (key === "gclid") {
      const gclid = JSON.parse(keyValue);
      const isGclidValid = new Date().getTime() < gclid.expiryDate;
      if (gclid && isGclidValid) {
        return gclid.value;
      }
    } else {
      return keyValue;
    }
  }
  return;
}
