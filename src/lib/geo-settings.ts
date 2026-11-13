// GEO Settings — Operating mode, schedule, publication controls.
// Stored in Supabase (production) or local file (dev/test).
// Default mode: MANUAL. Auto-publish OFF until explicitly enabled.

import fs from 'fs';
import path from 'path';

export type OperatingMode = 'automatic' | 'manual';

export interface GeoSettings {
  operating_mode: OperatingMode;
  schedule_enabled: boolean;
  schedule_frequency: string; // cron expression
  last_run: string | null;
  next_run: string | null;
  auto_publish_low_risk: boolean;
  require_review_medium_risk: boolean;
  require_review_high_risk: boolean;
  max_publications_per_run: number;
  pause_all_jobs: boolean;
  emergency_stop_publication: boolean;
  // Metadata
  updated_at: string;
  updated_by: string;
}

const DEFAULT_SETTINGS: GeoSettings = {
  operating_mode: 'manual',
  schedule_enabled: false,
  schedule_frequency: '0 2 * * *', // daily 2am
  last_run: null,
  next_run: null,
  auto_publish_low_risk: false,
  require_review_medium_risk: true,
  require_review_high_risk: true,
  max_publications_per_run: 5,
  pause_all_jobs: false,
  emergency_stop_publication: false,
  updated_at: new Date().toISOString(),
  updated_by: 'system',
};

const SETTINGS_FILE = path.join(process.cwd(), 'market-intel', 'geo-settings.json');

function ensureDir() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function getSettings(): GeoSettings {
  ensureDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    return { ...DEFAULT_SETTINGS, ...raw };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function updateSettings(patch: Partial<GeoSettings>, updatedBy: string = 'admin'): GeoSettings {
  const current = getSettings();
  const updated: GeoSettings = {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };

  // Safety: auto mode requires explicit opt-in
  if (updated.operating_mode === 'automatic' && !updated.auto_publish_low_risk) {
    // Auto mode can run analysis, but publishing requires explicit enable
  }

  // Emergency stop overrides everything
  if (updated.emergency_stop_publication) {
    updated.auto_publish_low_risk = false;
  }

  ensureDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  return updated;
}

export function isAutoMode(): boolean {
  return getSettings().operating_mode === 'automatic';
}

export function isPublishAllowed(): boolean {
  const s = getSettings();
  if (s.pause_all_jobs) return false;
  if (s.emergency_stop_publication) return false;
  if (s.operating_mode !== 'automatic') return false;
  if (!s.auto_publish_low_risk) return false;
  return true;
}

export function canPublishRiskLevel(riskLevel: string): boolean {
  const s = getSettings();
  if (riskLevel === 'high') return !s.require_review_high_risk;
  if (riskLevel === 'medium') return !s.require_review_medium_risk;
  return s.auto_publish_low_risk; // low risk
}
