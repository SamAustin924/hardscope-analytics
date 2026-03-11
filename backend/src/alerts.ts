import { getDb } from './db/database';
import { logger } from './utils/logger';

/**
 * Generates alerts after each ingest run.
 * Three alert types:
 *  1. engagement_drop   — creator's latest engagement dropped >20% vs their 7-day avg
 *  2. zero_conversions  — campaign creator has spend > 0 but 0 conversions
 *  3. high_spend_low_roi — creator spent >50% of campaign budget, <10% conversion target
 */
export function generateAlerts(): void {
  const db = getDb();

  // --- 1. Engagement drop alert ---
  // Compare latest snapshot engagement rate vs the average of the prior 7 days
  const engagementDropCreators = db.prepare(`
    SELECT
      c.id AS creator_id,
      c.display_name,
      latest.engagement_rate AS current_rate,
      AVG(prev.engagement_rate) AS avg_rate
    FROM creators c
    JOIN creator_snapshots latest ON latest.creator_id = c.id
    JOIN creator_snapshots prev ON prev.creator_id = c.id
    WHERE latest.snapshot_at = (
      SELECT MAX(s2.snapshot_at) FROM creator_snapshots s2 WHERE s2.creator_id = c.id
    )
    AND prev.snapshot_at >= datetime('now', '-7 days')
    AND prev.snapshot_at < latest.snapshot_at
    AND latest.engagement_rate > 0
    GROUP BY c.id
    HAVING current_rate < avg_rate * 0.80
  `).all() as Array<{ creator_id: string; display_name: string; current_rate: number; avg_rate: number }>;

  const insertAlert = db.prepare(`
    INSERT INTO alerts (creator_id, campaign_id, type, message, severity)
    VALUES (@creator_id, @campaign_id, @type, @message, @severity)
  `);

  // Dedupe: don't re-insert same unresolved alert for same creator in same day
  const existingAlert = db.prepare(`
    SELECT id FROM alerts
    WHERE creator_id = @creator_id
      AND type = @type
      AND resolved_at IS NULL
      AND created_at >= datetime('now', '-1 day')
    LIMIT 1
  `);

  for (const row of engagementDropCreators) {
    const exists = existingAlert.get({ creator_id: row.creator_id, type: 'engagement_drop' });
    if (exists) continue;

    const drop = Math.round((1 - row.current_rate / row.avg_rate) * 100);
    insertAlert.run({
      creator_id: row.creator_id,
      campaign_id: null,
      type: 'engagement_drop',
      message: `${row.display_name} engagement dropped ${drop}% vs 7-day average (${(row.current_rate * 100).toFixed(2)}% vs ${(row.avg_rate * 100).toFixed(2)}%)`,
      severity: drop >= 40 ? 'critical' : 'warning',
    });
    logger.info(`[alerts] Engagement drop flagged: ${row.display_name} (-${drop}%)`);
  }

  // --- 2. Zero conversions alert ---
  const zeroConversions = db.prepare(`
    SELECT
      cc.campaign_id,
      cc.creator_id,
      c.display_name,
      cam.name AS campaign_name,
      cc.spend
    FROM campaign_creators cc
    JOIN creators c ON c.id = cc.creator_id
    JOIN campaigns cam ON cam.id = cc.campaign_id
    WHERE cc.spend > 0 AND cc.conversions = 0 AND cam.status = 'active'
  `).all() as Array<{
    campaign_id: string;
    creator_id: string;
    display_name: string;
    campaign_name: string;
    spend: number;
  }>;

  const existingCampaignAlert = db.prepare(`
    SELECT id FROM alerts
    WHERE creator_id = @creator_id AND campaign_id = @campaign_id
      AND type = @type AND resolved_at IS NULL
    LIMIT 1
  `);

  for (const row of zeroConversions) {
    const exists = existingCampaignAlert.get({
      creator_id: row.creator_id,
      campaign_id: row.campaign_id,
      type: 'zero_conversions',
    });
    if (exists) continue;

    insertAlert.run({
      creator_id: row.creator_id,
      campaign_id: row.campaign_id,
      type: 'zero_conversions',
      message: `${row.display_name} has $${row.spend.toFixed(2)} spend but 0 conversions on "${row.campaign_name}"`,
      severity: 'warning',
    });
  }

  // --- 3. High spend / low ROI alert ---
  const highSpendLowRoi = db.prepare(`
    SELECT
      cc.campaign_id,
      cc.creator_id,
      c.display_name,
      cam.name AS campaign_name,
      cam.budget,
      cc.spend,
      cc.conversions,
      cc.clicks
    FROM campaign_creators cc
    JOIN creators c ON c.id = cc.creator_id
    JOIN campaigns cam ON cam.id = cc.campaign_id
    WHERE cam.budget > 0
      AND cc.spend > (cam.budget * 0.5)
      AND cc.conversions < (cc.clicks * 0.1)
      AND cc.clicks > 10
      AND cam.status = 'active'
  `).all() as Array<{
    campaign_id: string;
    creator_id: string;
    display_name: string;
    campaign_name: string;
    budget: number;
    spend: number;
    conversions: number;
    clicks: number;
  }>;

  for (const row of highSpendLowRoi) {
    const exists = existingCampaignAlert.get({
      creator_id: row.creator_id,
      campaign_id: row.campaign_id,
      type: 'high_spend_low_roi',
    });
    if (exists) continue;

    const ctr = ((row.conversions / row.clicks) * 100).toFixed(1);
    insertAlert.run({
      creator_id: row.creator_id,
      campaign_id: row.campaign_id,
      type: 'high_spend_low_roi',
      message: `${row.display_name} has used ${Math.round((row.spend / row.budget) * 100)}% of budget on "${row.campaign_name}" with only ${ctr}% conversion rate`,
      severity: 'critical',
    });
  }

  logger.info(`[alerts] Alert generation complete`);
}
