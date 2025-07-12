import { openDB } from "idb";
import { encryptData, decryptResponse } from "./api.js";

const DB_NAME = "UserDB";
const STORE_NAME = "users";

export const initDb = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });
};

// Function to save your specific encrypted data structure
export const saveEncryptedData = async (encryptedDataArray) => {
  const db = await initDb();
  const tx = db.transaction(STORE_NAME, "readwrite");

  try {
    // Clear existing data first (optional - remove if you want to append)
    await tx.store.clear();

    // Save each encrypted object
    for (let i = 0; i < encryptedDataArray.length; i++) {
      const item = encryptedDataArray[i];

      await tx.store.put({
        id: i + 1, // Auto-generated ID starting from 1
        d: item.d, // Encrypted data field
        n: item.n, // Encrypted name/number field
        t: item.t, // Encrypted type/timestamp field
        lastUpdated: new Date().toISOString(),
        index: i, // Original array index
      });
    }

    await tx.done;
    console.log(
      `Successfully saved ${encryptedDataArray.length} encrypted records to IndexedDB`
    );
  } catch (error) {
    console.error("Failed to save encrypted data:", error);
    throw error;
  }
};

// Function to retrieve all encrypted data
export const getAllEncryptedData = async () => {
  try {
    const db = await initDb();
    const allData = await db.getAll(STORE_NAME);

    // Sort by original index to maintain order
    return allData.sort((a, b) => (a.index || 0) - (b.index || 0));
  } catch (error) {
    console.error("Failed to retrieve encrypted data:", error);
    return [];
  }
};

// Function to retrieve a specific encrypted record by ID
export const getEncryptedDataById = async (id) => {
  try {
    const db = await initDb();
    return await db.get(STORE_NAME, id);
  } catch (error) {
    console.error("Failed to retrieve encrypted data by ID:", error);
    return null;
  }
};

// Function to update a specific record
export const updateEncryptedData = async (id, updatedData) => {
  try {
    const db = await initDb();
    const existing = await db.get(STORE_NAME, id);

    if (!existing) {
      throw new Error(`Record with ID ${id} not found`);
    }

    const updated = {
      ...existing,
      ...updatedData,
      lastUpdated: new Date().toISOString(),
    };

    await db.put(STORE_NAME, updated);
    console.log(`Successfully updated record with ID ${id}`);
  } catch (error) {
    console.error("Failed to update encrypted data:", error);
    throw error;
  }
};

// Function to delete a specific record
export const deleteEncryptedData = async (id) => {
  try {
    const db = await initDb();
    await db.delete(STORE_NAME, id);
    console.log(`Successfully deleted record with ID ${id}`);
  } catch (error) {
    console.error("Failed to delete encrypted data:", error);
    throw error;
  }
};

// Function to clear all data
export const clearAllEncryptedData = async () => {
  try {
    const db = await initDb();
    await db.clear(STORE_NAME);
    console.log("Successfully cleared all encrypted data");
  } catch (error) {
    console.error("Failed to clear encrypted data:", error);
    throw error;
  }
};
