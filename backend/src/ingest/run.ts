// Standalone script: npm run ingest
import 'dotenv/config';
import { getDb } from '../db/database';
import { runIngest } from './index';

(async () => {
  getDb(); // init DB
  const result = await runIngest();
  console.log('Ingest complete:', result);
  process.exit(0);
})();
