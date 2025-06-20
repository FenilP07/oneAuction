import jwt from "jsonwebtoken";

const generateAccessToken = (userId, role) => {
  return jwt.sign({ _id: userId, role }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });
};
const generateRefreshToken = (userId) => {
  return jwt.sign({ _id: userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
};

export { generateAccessToken, generateRefreshToken };
