import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/service-worker.js");
}
createApp(App).mount("#app");
