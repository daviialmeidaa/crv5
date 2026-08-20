const { clearCache } = require('./db/redis.js');
async function run() {
  await clearCache('opme:cirurgias:all');
  console.log('Cache limpo');
  process.exit(0);
}
run();
