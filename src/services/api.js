const baseURL = import.meta.env.VITE_API_BASE_URL;

/**
 * Fetch all users (with pagination handling)
 * @returns {Promise<Array>}
 */
export async function syncAllUsers() {
  let allUsers = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`${baseURL}/api/users?page=${page}`);
    if (!res.ok) {
      throw new Error(`Network error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    console.log(`Page ${page} response:`, data);

    // Handle different API response structures
    let pageUsers;
    if (Array.isArray(data)) {
      pageUsers = data;
    } else if (data.data && Array.isArray(data.data)) {
      pageUsers = data.data;
    } else if (data.data && typeof data.data === "object") {
      pageUsers = [data.data];
    } else {
      console.error("Unexpected page response structure:", data);
      break;
    }

    allUsers = allUsers.concat(pageUsers);
    if (pageUsers.length === 0 || page >= 10 || allUsers.length >= 1000) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allUsers;
}

/**
 * Fetch paginated users
 * @param {number} page
 * @returns {Promise<Object[]>}
 */
export async function getUsersPage(page) {
  const res = await fetch(`${baseURL}/api/users?page=${page}`);
  if (!res.ok) {
    throw new Error("Network error");
  }
  return res.json();
}

/**
 * POST login with encryption support
 * @param {string} id
 * @param {string} password
 * @returns {Promise<Object>} user data + token
 */
export async function loginUser(username, password) {
  const res = await fetch(`${baseURL}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error("Invalid credentials or server error");
  }

  const data = await res.json();

  // Handle encryption if present
  if (data.data && data.data.d && (data.data.i || data.data.t) && data.data.n) {
    const iv = data.data.i || data.data.t;
    const decryptedData = await decryptResponse(data.data.d, iv, data.data.n);
    return decryptedData;
  }

  return data;
}

/**
 * Decrypt API response using AES-GCM
 * @param {string} encryptedData - base64 encoded
 * @param {string} iv - base64 encoded (IV)
 * @param {string} tag - base64 encoded (authentication tag)
 * @returns {Promise<Object>}
 */
export async function decryptResponse(encryptedData, iv, tag) {
  try {
    console.log("Attempting to decrypt response...");

    // Decode base64 strings
    const decodedData = atob(encryptedData);
    const decodedIV = atob(iv);
    const decodedTag = atob(tag);

    // Get the first 16 characters of the decoded 'd' field as AES-GCM key
    const keyMaterial = decodedData.substring(0, 16);
    console.log("Key material length:", keyMaterial.length);

    // Import the key
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(keyMaterial),
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // Convert strings to Uint8Arrays
    const encryptedArray = new Uint8Array(
      decodedData
        .substring(16)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const ivArray = new Uint8Array(
      decodedIV.split("").map((c) => c.charCodeAt(0))
    );
    const tagArray = new Uint8Array(
      decodedTag.split("").map((c) => c.charCodeAt(0))
    );

    console.log("Encrypted data length:", encryptedArray.length);
    console.log("IV length:", ivArray.length);
    console.log("Tag length:", tagArray.length);

    // Combine encrypted data with tag for AES-GCM
    const combinedData = new Uint8Array(
      encryptedArray.length + tagArray.length
    );
    combinedData.set(encryptedArray);
    combinedData.set(tagArray, encryptedArray.length);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivArray,
        tagLength: 128,
      },
      key,
      combinedData
    );

    // Convert to string and parse JSON
    const decryptedText = new TextDecoder().decode(decrypted);
    console.log("Decrypted successfully, parsing JSON...");

    return JSON.parse(decryptedText);
  } catch (error) {
    console.error("Decryption failed:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    throw new Error("Failed to decrypt response: " + error.message);
  }
}
export async function encryptData(data, keyBase64) {
  const keyRaw = atob(keyBase64).slice(0, 16);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(keyRaw),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoded
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}
export async function syncAllUsersWithPagination() {
  const pagination = new PaginationHandler(10, 1000);

  const fetchPage = async (page) => {
    const response = await fetch(`/api/users?page=${page}&limit=50`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  };

  return await pagination.fetchAllPages(fetchPage);
}
