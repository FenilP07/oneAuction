
import crypto from "crypto";

const ENCRYPTION_KEY = crypto.randomBytes(32);
const IV_LENGTH = 16;

export function encryptAmount(amount) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(amount.toString(), "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptAmount(encrypted) {
  const [ivHex, encryptedData] = encrypted.split(":");
  if (!ivHex || !encryptedData) {
    throw new Error("Invalid encrypted data format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return Number(decrypted);
}