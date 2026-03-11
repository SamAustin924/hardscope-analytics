import { getDb } from './database';
import { logger } from '../utils/logger';

const CAMPAIGNS = [
  { id: 'camp_001', name: 'Summer Tech Launch', brand: 'TechGear Pro', budget: 50000, start_date: '2024-06-01', end_date: '2024-08-31', status: 'completed' },
  { id: 'camp_002', name: 'Q4 Holiday Push', brand: 'ShopNow', budget: 120000, start_date: '2024-11-01', end_date: '2024-12-31', status: 'completed' },
  { id: 'camp_003', name: 'Gaming Peripherals Drop', brand: 'HyperX', budget: 75000, start_date: '2025-01-15', end_date: '2025-03-31', status: 'active' },
  { id: 'camp_004', name: 'Spring Fitness Challenge', brand: 'FitLife', budget: 30000, start_date: '2025-03-01', end_date: '2025-05-31', status: 'active' },
  { id: 'camp_005', name: 'Creator Fund Pilot', brand: 'HardScope', budget: 200000, start_date: '2025-01-01', end_date: '2025-12-31', status: 'active' },
];

const CAMPAIGN_CREATORS = [
  // camp_003 Gaming Peripherals Drop (HyperX)
  { campaign_id: 'camp_003', creator_id: 'twitch:19571641',                   spend: 18000, impressions: 6200000,  clicks: 93000,  conversions: 3720  }, // ninja
  { campaign_id: 'camp_003', creator_id: 'twitch:71092938',                   spend: 22000, impressions: 9100000,  clicks: 45500,  conversions: 910   }, // xqc — high spend/low conv
  { campaign_id: 'camp_003', creator_id: 'twitch:37402112',                   spend: 14000, impressions: 4800000,  clicks: 72000,  conversions: 2880  }, // shroud
  { campaign_id: 'camp_003', creator_id: 'youtube:UCVhQ2NnY5Rskt6UjCUkJ_DA', spend: 9500,  impressions: 2100000,  clicks: 42000,  conversions: 1680  }, // arjancodes
  // camp_004 Spring Fitness Challenge (FitLife)
  { campaign_id: 'camp_004', creator_id: 'youtube:UCY30JRSgfhYXA6i6xX1erWg', spend: 8000,  impressions: 1500000,  clicks: 30000,  conversions: 0     }, // smosh — zero conv alert
  { campaign_id: 'camp_004', creator_id: 'youtube:UCX6OQ3DkcsbYNE6H8uQQuVA', spend: 15000, impressions: 12000000, clicks: 240000, conversions: 14400 }, // mrbeast
  // camp_005 Creator Fund Pilot (HardScope)
  { campaign_id: 'camp_005', creator_id: 'youtube:UCX6OQ3DkcsbYNE6H8uQQuVA', spend: 50000, impressions: 30000000, clicks: 600000, conversions: 42000 }, // mrbeast
  { campaign_id: 'camp_005', creator_id: 'twitch:19571641',                   spend: 35000, impressions: 8000000,  clicks: 40000,  conversions: 2800  }, // ninja
  { campaign_id: 'camp_005', creator_id: 'twitch:44445592',                   spend: 28000, impressions: 6500000,  clicks: 32500,  conversions: 3250  }, // pokimane
  { campaign_id: 'camp_005', creator_id: 'youtube:UCY30JRSgfhYXA6i6xX1erWg', spend: 12000, impressions: 4200000,  clicks: 63000,  conversions: 1890  }, // smosh
];

export function seedCampaigns(): void {
  const db = getDb();

  const campaignCount = (db.prepare('SELECT COUNT(*) as c FROM campaigns').get() as { c: number }).c;
  if (campaignCount > 0) return;

  const insertCampaign = db.prepare(`
    INSERT OR IGNORE INTO campaigns (id, name, brand, budget, start_date, end_date, status)
    VALUES (@id, @name, @brand, @budget, @start_date, @end_date, @status)
  `);

  const insertCC = db.prepare(`
    INSERT OR IGNORE INTO campaign_creators (campaign_id, creator_id, spend, impressions, clicks, conversions)
    VALUES (@campaign_id, @creator_id, @spend, @impressions, @clicks, @conversions)
  `);

  db.exec('BEGIN');
  try {
    for (const c of CAMPAIGNS) insertCampaign.run(c);
    for (const cc of CAMPAIGN_CREATORS) {
      try { insertCC.run(cc); } catch { /* creator may not exist yet */ }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  logger.info(`[seed] Campaigns seeded`);
}
