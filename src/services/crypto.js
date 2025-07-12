import bcrypt from "bcryptjs";

export async function decryptWithAESGCM(encryptedData, keySource) {
  try {
    // Decode the base64 data
    const decodedD = atob(encryptedData.d);
    const decodedN = atob(encryptedData.n); // nonce/IV
    const decodedT = atob(encryptedData.t); // tag

    // Use first 16 characters of decoded 'd' as AES-GCM key
    const keyString = decodedD.substring(0, 16);
    const keyBuffer = new TextEncoder().encode(keyString);

    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBuffer,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // Prepare encrypted data (remove the key part)
    const encryptedContent = decodedD.substring(16);
    const dataBuffer = new TextEncoder().encode(encryptedContent);
    const nonceBuffer = new TextEncoder().encode(decodedN);
    const tagBuffer = new TextEncoder().encode(decodedT);

    // Combine data and tag for decryption
    const combinedBuffer = new Uint8Array(dataBuffer.length + tagBuffer.length);
    combinedBuffer.set(dataBuffer);
    combinedBuffer.set(tagBuffer, dataBuffer.length);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: nonceBuffer,
      },
      cryptoKey,
      combinedBuffer
    );

    // Convert back to string
    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decryptedText);
  } catch (error) {
    console.error("AES-GCM Decryption failed:", error);
    throw new Error("Failed to decrypt user data");
  }
}

/**
 * Compare password using bcrypt
 */
export async function comparePasswordWithBcrypt(plainPassword, hashedPassword) {
  try {
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    console.log("Password validation result:", isValid);
    return isValid;
  } catch (error) {
    console.error("Bcrypt comparison failed:", error);
    return false;
  }
}

/**
 * Hash password using bcrypt (for testing)
 */
export async function hashPassword(plainPassword) {
  const saltRounds = 10;
  return await bcrypt.hash(plainPassword, saltRounds);
}
