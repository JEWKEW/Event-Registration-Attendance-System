import { createApp } from './app.js';
import { config } from './lib/config.js';

const app = createApp();

app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on 0.0.0.0:${config.PORT} [${config.NODE_ENV}]`);
});
