import { createApp } from './app.js';
import { config } from './lib/config.js';

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`🚀 Server listening on port ${config.PORT} [${config.NODE_ENV}]`);
});
