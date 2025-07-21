import User from "../models/users.models.js";
import { apiError } from "./apiError.js";

// Cool names for auction-style users
const coolAuctionNames = [
  "bidmaster", "sniper", "hammerdeal", "quickbid", "vaultking",
  "dealhunter", "goldstrike", "fastbid", "auctioneer", "topbidder",
  "coinflipper", "lotwinner", "artseeker", "rarehunter", "bidblazer",
  "treasurehunt", "coinkeeper", "bidwiz", "auctionguru", "dealmaker",
  "hammerstrike", "bidchamp", "lotlover", "pricehunter", "dealseeker"
];

// Avatar generation services (free APIs that generate avatars)
const avatarServices = [
  {
    name: "DiceBear Adventurer",
    url: (seed) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
  },
  {
    name: "DiceBear Avataaars",
    url: (seed) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
  },
  {
    name: "DiceBear Big Smile",
    url: (seed) => `https://api.dicebear.com/7.x/big-smile/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
  },
  {
    name: "DiceBear Bottts",
    url: (seed) => `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
  },
  {
    name: "DiceBear Personas",
    url: (seed) => `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`
  }
];

/**
 * Generates a random username based on auction theme
 * @param {string} firstName - User's first name (optional, used as fallback seed)
 * @param {string} lastName - User's last name (optional, used as fallback seed)
 * @returns {Promise<string>} - Generated unique username
 */
const generateRandomUsername = async (firstName = "", lastName = "") => {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const name = coolAuctionNames[Math.floor(Math.random() * coolAuctionNames.length)];
    const suffix = Math.floor(10 + Math.random() * 90);
    const username = `${name}_${suffix}`;

    const existingUser = await User.findOne({ username });
    if (!existingUser) {
      return username;
    }
  }

  // Fallback: use firstName + lastName + random number if available
  if (firstName && lastName) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = Math.floor(100 + Math.random() * 900);
      const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${suffix}`;
      
      const existingUser = await User.findOne({ username });
      if (!existingUser) {
        return username;
      }
    }
  }

  throw new apiError(500, "Unable to generate a unique username after multiple attempts");
};

/**
 * Generates a random avatar URL using free avatar generation services
 * @param {string} seed - Seed for avatar generation (username, email, or random string)
 * @param {string} style - Avatar style preference (optional)
 * @returns {string} - Avatar URL
 */
const generateRandomAvatar = (seed = null, style = null) => {
  // Generate a seed if none provided
  if (!seed) {
    seed = Math.random().toString(36).substring(2, 15);
  }

  // Clean the seed (remove special characters, spaces, etc.)
  const cleanSeed = seed.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'default';

  let selectedService;
  
  if (style) {
    // Find specific style if requested
    selectedService = avatarServices.find(service => 
      service.name.toLowerCase().includes(style.toLowerCase())
    );
  }

  // If no specific style found or requested, pick random
  if (!selectedService) {
    selectedService = avatarServices[Math.floor(Math.random() * avatarServices.length)];
  }

  return selectedService.url(cleanSeed);
};

/**
 * Generates both username and avatar for new user
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @param {string} email - User's email (used as avatar seed)
 * @param {string} preferredStyle - Preferred avatar style (optional)
 * @returns {Promise<Object>} - Object containing username and avatarUrl
 */
const generateUserCredentials = async (firstName = "", lastName = "", email = "", preferredStyle = null) => {
  try {
    const username = await generateRandomUsername(firstName, lastName);
    
    // Use email as primary seed, fallback to username, then firstName+lastName
    const avatarSeed = email || username || `${firstName}${lastName}`;
    const avatarUrl = generateRandomAvatar(avatarSeed, preferredStyle);

    return {
      username,
      avatarUrl
    };
  } catch (error) {
    throw new apiError(500, `Failed to generate user credentials: ${error.message}`);
  }
};

/**
 * Get available avatar styles
 * @returns {Array<string>} - Array of available avatar style names
 */
const getAvailableAvatarStyles = () => {
  return avatarServices.map(service => service.name);
};

export { 
  generateRandomUsername, 
  generateRandomAvatar, 
  generateUserCredentials,
  getAvailableAvatarStyles 
};