/**
 * BLE GATT 常量（与 esp_gps_blue/esp_gps_blue/server.js 保持一致）
 * 震动（旅行日记成功入柜收集物时）：普通款（tier C）-> VIB:1 短震；其余（B/A/S 等）-> VIB:2 长震
 */
(function (global) {
  global.ESP32_BLE_CONFIG = {
    DEVICE_NAME: 'ESP32-C3-Tracker',
    SERVICE_UUID: '12345678-1234-1234-1234-123456789abc',
    CHAR_TX_UUID: '12345678-1234-1234-1234-123456789abd',
    CHAR_RX_UUID: '12345678-1234-1234-1234-123456789abe',
    /** 入柜收集物场景 tier -> handleCommand VIB mode（1=短震 2=长震） */
    TIER_TO_VIB: { C: 1, B: 2, A: 2, S: 2 }
  };
})(typeof window !== 'undefined' ? window : globalThis);
