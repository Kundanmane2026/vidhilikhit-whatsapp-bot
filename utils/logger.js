/**
 * Logger — Winston with structured JSON logging
 * Always logs to console (required for Render log viewer)
 */

const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'vidhilikhit-pro' },
  transports: [
    // Always log to console — Render captures stdout/stderr
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
    })
  ]
});

module.exports = logger;
