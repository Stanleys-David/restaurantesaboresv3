if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../sw.js").catch((error) => console.warn("[v0] PWA no disponible", error)))
