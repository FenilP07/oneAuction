import { createLogger, format, transports } from "winston";
const { combine, timestamp, json, printf, colorize } = format;

// Custom format for console logging with colors, timestamps, and metadata
const consoleLogFormat = printf(({ level, message, timestamp, ...meta }) => {
  // Check if there's any metadata to include
  const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level}: ${message}${metaString}`;
});

// Create a Winston logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || "info", // Default to "info" but allow overrides
  format: combine(timestamp(), json()), // JSON format for file logs
  transports: [
    new transports.Console({
      format: combine(colorize(), timestamp(), consoleLogFormat), // Colorized console logs with timestamp and metadata
    }),
    new transports.File({ filename: "app.log" }), // File logs in JSON format (will include metadata automatically)
  ],
});

export default logger;