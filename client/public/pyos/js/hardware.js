/* hardware.js -- perfil de hardware, consumo dinámico, red y actualizaciones de PyOS. */
(function () {
  "use strict";
  const VERSION = "2.3.0";
  const KEY = "pyos_hardware_v3";
  const UPDATE_KEY = "pyos_update_state_v1";
  const DEFAULT = {
    cpu: { id: "ryzen-7-7800x3d", vendor: "AMD", model: "AMD Ryzen 7 7800X3D", cores: 8, threads: 16, baseGHz: 4.2, boostGHz: 5.0, tdp: 120, tier: "Alta" },
    gpu: { id: "rtx-4070-super", vendor: "NVIDIA", model: "NVIDIA GeForce RTX 4070 SUPER", vram: 12, rayTracing: true, tflops: 35.5, tier: "Alta" },
    ram: { gb: 32, type: "DDR5", speed: 6000 },
    storage: { gb: 1024, type: "NVMe PCIe 4.0", freeGb: 918 },
    network: { mode: "ethernet", connected: true, wifiEnabled: true, ssid: "PyOS-Lab-5G", signal: 92, speedMbps: 1000 },
    renderer: { taa: "TAAU Ultimate", frameGeneration: true, resolutionScale: 1, rayTracing: true, noise: 0.08 },
  };
  const CPU_CATALOG = [
    { id: "ryzen-9-9950x", vendor: "AMD", model: "AMD Ryzen 9 9950X", cores: 16, threads: 32, baseGHz: 4.3, boostGHz: 5.7, tdp: 170, tier: "Entusiasta" },
    { id: "ryzen-7-7800x3d", vendor: "AMD", model: "AMD Ryzen 7 7800X3D", cores: 8, threads: 16, baseGHz: 4.2, boostGHz: 5.0, tdp: 120, tier: "Alta" },
    { id: "core-ultra-9-285k", vendor: "Intel", model: "Intel Core Ultra 9 285K", cores: 24, threads: 24, baseGHz: 3.7, boostGHz: 5.7, tdp: 250, tier: "Entusiasta" },
    { id: "core-i9-14900ks", vendor: "Intel", model: "Intel Core i9-14900KS", cores: 24, threads: 32, baseGHz: 4.0, boostGHz: 6.2, tdp: 253, tier: "Entusiasta" },
    { id: "ryzen-5-7600", vendor: "AMD", model: "AMD Ryzen 5 7600", cores: 6, threads: 12, baseGHz: 3.8, boostGHz: 5.1, tdp: 65, tier: "Media" },
    { id: "core-i5-14600k", vendor: "Intel", model: "Intel Core i5-14600K", cores: 14, threads: 20, baseGHz: 3.5, boostGHz: 5.3, tdp: 181, tier: "Media" },
  ];
  const GPU_CATALOG = [
    { id: "rtx-4090", vendor: "NVIDIA", model: "NVIDIA GeForce RTX 4090", vram: 24, rayTracing: true, tflops: 82.6, tier: "Entusiasta" },
    { id: "rtx-4080-super", vendor: "NVIDIA", model: "NVIDIA GeForce RTX 4080 SUPER", vram: 16, rayTracing: true, tflops: 52.2, tier: "Entusiasta" },
    { id: "rtx-4070-super", vendor: "NVIDIA", model: "NVIDIA GeForce RTX 4070 SUPER", vram: 12, rayTracing: true, tflops: 35.5, tier: "Alta" },
    { id: "rx-7900-xtx", vendor: "AMD", model: "AMD Radeon RX 7900 XTX", vram: 24, rayTracing: true, tflops: 61.4, tier: "Entusiasta" },
    { id: "rx-9070-xt", vendor: "AMD", model: "AMD Radeon RX 9070 XT", vram: 16, rayTracing: true, tflops: 48.7, tier: "Alta" },
    { id: "arc-b580", vendor: "Intel", model: "Intel Arc B580", vram: 12, rayTracing: true, tflops: 14.6, tier: "Media" },
    { id: "arc-a770", vendor: "Intel", model: "Intel Arc A770", vram: 16, rayTracing: true, tflops: 17.2, tier: "Media" },
    { id: "radeon-780m", vendor: "AMD", model: "AMD Radeon 780M integrada", vram: 4, rayTracing: false, tflops: 3.7, tier: "Integrada" },
    { id: "arc-integrated", vendor: "Intel", model: "Intel Arc Graphics integrada", vram: 2, rayTracing: false, tflops: 2.8, tier: "Integrada" },
  ];
  const RAM_CATALOG = [8, 16, 32, 64, 128];
  const STORAGE_CATALOG = [256, 512, 1024, 2048, 4096];
  const APP_LOADS = {
    shell: { cpu: 2, gpu: 1, ram: 0.3, disk: 0.1, net: 0.02 }, desktop: { cpu: 4, gpu: 3, ram: 0.8, disk: 0.2, net: 0.02 }, touch: { cpu: 3, gpu: 2, ram: 0.6, disk: 0.1, net: 0.02 }, console: { cpu: 3, gpu: 4, ram: 0.7, disk: 0.1, net: 0.02 }, voxelforge: { cpu: 18, gpu: 34, ram: 1.8, disk: 1.2, net: 0.15 }, benchmark3d: { cpu: 24, gpu: 72, ram: 2.4, disk: 1.8, net: 0.06 }, "nvidia-app": { cpu: 7, gpu: 8, ram: 0.7, disk: 0.3, net: 0.18 }, "nvidia-control": { cpu: 3, gpu: 1, ram: 0.35, disk: 0.1, net: 0.03 }, "radeon-adrenalin": { cpu: 7, gpu: 9, ram: 0.7, disk: 0.3, net: 0.18 }, "intel-graphics": { cpu: 6, gpu: 8, ram: 0.65, disk: 0.3, net: 0.18 }, device: { cpu: 6, gpu: 5, ram: 0.8, disk: 0.4, net: 0.04 }, "hardware-center": { cpu: 6, gpu: 5, ram: 0.9, disk: 0.4, net: 0.08 }, "gpu-control": { cpu: 3, gpu: 2, ram: 0.4, disk: 0.1, net: 0.03 }, update: { cpu: 10, gpu: 1, ram: 0.5, disk: 5, net: 2 }, browser: { cpu: 9, gpu: 7, ram: 0.8, disk: 0.2, net: 1.6 }, default: { cpu: 5, gpu: 3, ram: 0.5, disk: 0.2, net: 0.1 }, };
  const WIFI_NETWORKS = [
    { ssid: "PyOS-Lab-5G", signal: 92, security: "WPA3", speedMbps: 867 },
    { ssid: "Taller-2.4G", signal: 74, security: "WPA2", speedMbps: 144 },
    { ssid: "Red-malla", signal: 58, security: "WPA2", speedMbps: 300 },
    { ssid: "Invitados", signal: 35, security: "Abierta", speedMbps: 54 },
  ];
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function read(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : clone(fallback); } catch (_) { return clone(fallback); } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
  function merge(base, value) { const out = clone(base); Object.keys(value || {}).forEach((k) => { out[k] = value[k] && typeof value[k] === "object" && !Array.isArray(value[k]) && out[k] ? merge(out[k], value[k]) : value[k]; }); return out; }
  function migrate() { const current = read(KEY, {}); const next = merge(DEFAULT, current); if (!next.version) next.version = VERSION; write(KEY, next); return next; }
  function get() { return migrate(); }
  function set(patch) { const next = merge(get(), patch); write(KEY, next); window.dispatchEvent(new CustomEvent("pyos:hardware-change", { detail: next })); return next; }
  function appLoad(id) { return APP_LOADS[id] || APP_LOADS.default; }
  function setNetwork(patch) { return set({ network: patch }); }
  function updateState() { return read(UPDATE_KEY, { current: VERSION, channel: "stable", lastChecked: null, history: [] }); }
  function saveUpdate(state) { write(UPDATE_KEY, state); return state; }
  function installUpdate() { const state = updateState(); const old = state.current; state.current = VERSION; state.lastChecked = new Date().toISOString(); state.history = (state.history || []).concat({ from: old, to: VERSION, at: state.lastChecked, preserved: true }); saveUpdate(state); return state; }
  window.PyHardware = { VERSION, DEFAULT, CPU_CATALOG, GPU_CATALOG, RAM_CATALOG, STORAGE_CATALOG, WIFI_NETWORKS, APP_LOADS, get, set, appLoad, setNetwork, updateState, installUpdate };
})();
