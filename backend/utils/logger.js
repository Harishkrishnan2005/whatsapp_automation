import winston from 'winston';
import 'winston-mongodb';
import dotenv from 'dotenv';
dotenv.config();

const { combine, timestamp, printf, colorize, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  return `${timestamp} [${level}]: ${stack || message} ${Object.keys(metadata).length ? JSON.stringify(metadata) : ''}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production' ? json() : logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        logFormat
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Add MongoDB transport in production if MONGO_URI is available
if (process.env.NODE_ENV === 'production' && process.env.MONGO_URI) {
  logger.add(new winston.transports.MongoDB({
    db: process.env.MONGO_URI,
    options: { useUnifiedTopology: true },
    collection: 'server_logs',
    level: 'info'
  }));
}

export default logger;
