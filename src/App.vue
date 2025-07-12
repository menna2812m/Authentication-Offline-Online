<script setup>
import { onMounted, ref, onUnmounted } from "vue";
import Login from "./components/Login.vue";
import { syncAllUsers } from "./services/api";
import {
  saveEncryptedData,
  getAllEncryptedData,
  clearAllEncryptedData,
} from "./services/indexedDb";
import { PaginationHandler } from "./services/pagination";
import { maskUserData } from "./services/userMasking";

const isOnline = ref(navigator.onLine);
const syncInProgress = ref(false);
const lastSyncTime = ref(null);
const syncError = ref(null);
const syncProgress = ref(0);
const syncStats = ref({ pages: 0, records: 0 });

let syncInterval;

function adaptUser(user) {
  const [firstName, ...lastParts] = (user.name || "").split(" ");

  const adaptedUser = {
    ...user,
    firstName: firstName || "",
    lastName: lastParts.join(" ") || "",
    // Ensure we have an ID field
    id: user.id || user.userId,
  };

  return adaptedUser;
}

async function processEncryptedResponse(response) {
  try {
    if (!Array.isArray(response)) {
      throw new Error("Invalid response format - expected array");
    }

    const validUsers = response.filter((user) => {
      const hasRequiredFields = user.d && user.t && user.n;

      return hasRequiredFields;
    });

    const adaptedUsers = validUsers.map(adaptUser);
    const maskedUsers = adaptedUsers.map(maskUserData);

    return maskedUsers;
  } catch (error) {
    throw error;
  }
}

async function syncUsersWithPagination() {
  const pagination = new PaginationHandler(10, 1000);

  const maxPages = parseInt(localStorage.getItem("maxSyncPages")) || 10;
  const maxRecords = parseInt(localStorage.getItem("maxSyncRecords")) || 1000;
  pagination.configureLimits(maxPages, maxRecords);

  const fetchPage = async (page) => {
    syncStats.value.pages = page;
    syncProgress.value = Math.min((page / maxPages) * 100, 100);

    try {
      const response = await syncAllUsers(page);

      if (response && response.length) {
        syncStats.value.records += response.length;
      }

      return response;
    } catch (error) {
      throw error;
    }
  };

  return await pagination.fetchAllPages(fetchPage);
}

async function initialSyncUsers() {
  if (syncInProgress.value) {
    return;
  }

  syncInProgress.value = true;
  syncError.value = null;
  syncProgress.value = 0;
  syncStats.value = { pages: 0, records: 0 };

  try {
    const response = await syncUsersWithPagination();

    const processedUsers = await processEncryptedResponse(response);

    await clearAllEncryptedData();
    await saveEncryptedData(processedUsers);

    lastSyncTime.value = new Date().toISOString();
    syncProgress.value = 100;
  } catch (err) {
    syncError.value = err.message || "Sync failed";
  } finally {
    syncInProgress.value = false;
  }
}

async function handleOnlineSync() {
  await initialSyncUsers();
}

function handleOnline() {
  isOnline.value = true;
  handleOnlineSync();
}

function handleOffline() {
  isOnline.value = false;
  syncError.value = null;
}

async function manualSync() {
  if (!isOnline.value) {
    return;
  }

  await initialSyncUsers();
}

const cachedUserCount = ref(0);
async function updateCachedUserCount() {
  try {
    const cached = await getAllEncryptedData();
    cachedUserCount.value = cached.length;
  } catch (error) {
    cachedUserCount.value = 0;
  }
}

onMounted(async () => {
  await updateCachedUserCount();

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }

  await initialSyncUsers();

  await updateCachedUserCount();

  syncInterval = setInterval(async () => {
    if (isOnline.value && !syncInProgress.value) {
      await initialSyncUsers();
      await updateCachedUserCount();
    }
  }, 60 * 1000); // 60 seconds

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
});

onUnmounted(() => {
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  window.removeEventListener("online", handleOnline);
  window.removeEventListener("offline", handleOffline);
});
</script>

<template>
  <div class="app-container">
    <!-- Sync Status Display -->
    <div class="status-bar">
      <!-- Sync in progress -->
      <div v-if="syncInProgress" class="sync-status">
        <div class="spinner"></div>
        Syncing users... Please wait.
        <span class="sync-details"
          >(Page {{ syncStats.pages }}, {{ syncStats.records }} records)</span
        >
      </div>

      <!-- Offline status -->
      <div v-else-if="!isOnline" class="offline-status">
        You are offline. Using cached data ({{ cachedUserCount }} users).
      </div>

      <!-- Sync error -->
      <div v-else-if="syncError" class="error-status">
        Sync failed: {{ syncError }}
        <button @click="manualSync" class="retry-btn">Retry</button>
      </div>

      <!-- Success status -->
      <div v-else-if="lastSyncTime" class="success-status">
        Last synced: {{ new Date(lastSyncTime).toLocaleTimeString() }} ({{
          cachedUserCount
        }}
        users)
      </div>
    </div>

    <Login />
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
}

.status-bar {
  position: sticky;
  top: 0;
  z-index: 1000;
  transform: translate(5%, 0);
}

.sync-status {
  background: #e3f2fd;
  padding: 12px;
  text-align: center;
  color: #1976d2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sync-details {
  font-size: 12px;
  opacity: 0.8;
}

.offline-status {
  background: #fff3e0;
  padding: 12px;
  text-align: center;
  color: #f57c00;
  border-bottom: 1px solid #ffcc02;
}

.error-status {
  background: #ffebee;
  padding: 12px;
  text-align: center;
  color: #c62828;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.success-status {
  background: #e8f5e8;
  padding: 8px 12px;
  text-align: center;
  color: #2e7d32;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sync-info {
  background: #f3f4f6;
  padding: 8px 12px;
  text-align: center;
  color: #6b7280;
  font-size: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e3f2fd;
  border-top: 2px solid #1976d2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
