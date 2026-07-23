'use strict';

// CloudLinux Passenger commonly loads a CommonJS startup file. The application
// bundle remains ESM and is imported dynamically without changing local npm start.
process.env.NODE_ENV = 'production';

import('./dist/server.js').catch(() => {
  console.error('Konjo Coffee failed to start. Review the redacted application logs.');
  process.exit(1);
});
