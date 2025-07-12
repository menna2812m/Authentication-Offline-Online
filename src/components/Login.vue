<template>
  <div class="login-container">
    <div class="login-form">
      <h1>Login</h1>

      <!-- Network Status Indicator -->
      <div v-if="!isOnline" class="network-status offline">
        📡 Offline - Using cached data
      </div>
      <div v-else-if="networkError" class="network-status error">
        ⚠️ Network issues detected
      </div>

      <input
        v-model="userId"
        placeholder="User ID (e.g., 65)"
        :disabled="loginInProgress"
        @keyup.enter="login"
      />
      <input
        v-model="password"
        type="password"
        placeholder="Password "
        :disabled="loginInProgress"
        @keyup.enter="login"
      />

      <button
        @click="login"
        :disabled="loginInProgress || !userId || !password"
        class="login-btn"
      >
        {{ loginInProgress ? "Logging in..." : "Login" }}
      </button>

      <!-- Login Method Indicator -->
      <div v-if="loginMethod" class="login-method">
        {{ loginMethod }}
      </div>

      <p v-if="status" :class="statusClass">{{ status }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { loginUser } from "../services/api";
import {
  getAllEncryptedData,
  clearAllEncryptedData,
} from "../services/indexedDb";
import { decryptResponse } from "../services/api"; // Assuming you have this

const userId = ref("");
const password = ref("");
const status = ref("");
const loginInProgress = ref(false);
const loginSuccess = ref(false);
const loginMethod = ref("");
const isOnline = ref(navigator.onLine);
const networkError = ref(false);
const cachedUserCount = ref(0);
const lastApiCall = ref(null);

const statusClass = computed(() => {
  return loginSuccess.value ? "status-success" : "status-error";
});

// Monitor network status
function updateNetworkStatus() {
  isOnline.value = navigator.onLine;
  if (isOnline.value) {
    networkError.value = false;
  }
}

onMounted(() => {
  window.addEventListener("online", updateNetworkStatus);
  window.addEventListener("offline", updateNetworkStatus);
  loadCachedUserCount();
});

async function loadCachedUserCount() {
  try {
    const cached = await getAllEncryptedData();
    cachedUserCount.value = cached.length;
  } catch (error) {
    cachedUserCount.value = 0;
  }
}

const login = async () => {
  if (!userId.value || !password.value) {
    status.value = "Please enter both User ID and Password";
    loginSuccess.value = false;
    return;
  }

  loginInProgress.value = true;
  loginMethod.value = "";
  status.value = "Logging in...";
  networkError.value = false;

  try {
    if (isOnline.value) {
      try {
        loginMethod.value = "Trying online login...";

        const result = await loginUser(userId.value, password.value);
        lastApiCall.value = new Date().toISOString();

        // Handle successful online login
        await handleSuccessfulLogin(result, "online");
        return;
      } catch (apiError) {
        networkError.value = true;
        loginMethod.value = "Online failed, trying cached data...";
      }
    }

    // **OFFLINE FALLBACK** - Check cached user data
    const cachedUser = await findCachedUser(userId.value);

    if (cachedUser) {
      const isPasswordValid = await validateCachedPassword(
        password.value,
        cachedUser
      );

      if (isPasswordValid) {
        await handleSuccessfulLogin({ user: cachedUser }, "cached");
        return;
      } else {
        throw new Error("Invalid password for cached user");
      }
    } else {
      throw new Error(
        "User not found in cache and unable to connect to server"
      );
    }
  } catch (err) {
    status.value = "Login failed: " + err.message;
    loginSuccess.value = false;
    loginMethod.value = "";
  } finally {
    loginInProgress.value = false;
  }
};

/**
 * Find user in cached encrypted data
 */
async function findCachedUser(userIdToFind) {
  try {
    const cachedUsers = await getAllEncryptedData();

    // Since the data is encrypted, we need to decrypt and check each user
    for (const encryptedUser of cachedUsers) {
      try {
        // Decrypt the user data (you'll need to implement this based on your encryption)
        const decryptedData = await decryptUserData(encryptedUser);

        // Check if this is the user we're looking for
        if (
          decryptedData.id == userIdToFind ||
          decryptedData.userId == userIdToFind
        ) {
          return decryptedData;
        }
      } catch (decryptError) {
        continue;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Decrypt user data (implement based on your encryption method)
 */
async function decryptUserData(encryptedUser) {
  try {
    const decryptedD = await decryptResponse(
      encryptedUser.d,
      "your-encryption-key"
    );
    const userData = JSON.parse(decryptedD);

    return {
      ...userData,
      id: userData.id || userData.userId,
      // Add other fields as needed
    };
  } catch (error) {
    throw new Error("Failed to decrypt user data");
  }
}

async function validateCachedPassword(inputPassword, cachedUser) {
  const expectedPassword = `test@${cachedUser.id}!`;
  return inputPassword === expectedPassword;
}

async function handleSuccessfulLogin(result, method) {
  const user = result.user;
  const token = result.token;

  // Update UI
  status.value = `Login successful! (${
    method === "online" ? "Online" : "Offline"
  })`;
  loginSuccess.value = true;
  loginMethod.value = `✅ Logged in via ${
    method === "online" ? "online" : "cached data"
  }`;
}
</script>

<style lang="scss">
.login-form {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  width: 100%;
  min-width: 500px;

  h1 {
    text-align: center;
    margin-bottom: 1.5rem;
    color: #333;
  }

  display: flex;
  flex-direction: column;
  gap: 15px;

  input {
    height: 45px;
    padding: 0 15px;
    border: 2px solid #e1e5e9;
    border-radius: 5px;
    font-size: 16px;
    transition: border-color 0.3s ease;

    &:focus {
      outline: none;
      border-color: #667eea;
    }

    &:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }
  }

  .login-btn {
    height: 45px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.3s ease;

    &:hover:not(:disabled) {
      opacity: 0.9;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .network-status {
    padding: 8px 12px;
    border-radius: 5px;
    font-size: 14px;
    text-align: center;
    font-weight: 600;

    &.offline {
      background: #fff3e0;
      color: #f57c00;
      border: 1px solid #ffcc02;
    }

    &.error {
      background: #ffebee;
      color: #c62828;
      border: 1px solid #f44336;
    }
  }

  .login-method {
    background: #e8f5e8;
    color: #2e7d32;
    padding: 8px 12px;
    border-radius: 5px;
    font-size: 14px;
    text-align: center;
    font-weight: 500;
  }

  .status-success {
    color: #4caf50;
    font-weight: 600;
    text-align: center;
  }

  .status-error {
    color: #f44336;
    font-weight: 600;
    text-align: center;
  }

  .debug-info {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 5px;
    border: 1px solid #ddd;
    margin-top: 15px;

    h4 {
      margin: 0 0 10px 0;
      color: #666;
    }

    p {
      margin: 5px 0;
      font-size: 12px;
      color: #777;
    }

    .debug-btn {
      background: #e0e0e0;
      border: 1px solid #ccc;
      padding: 5px 10px;
      margin: 5px 5px 0 0;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;

      &:hover {
        background: #d0d0d0;
      }
    }
  }
}
</style>
