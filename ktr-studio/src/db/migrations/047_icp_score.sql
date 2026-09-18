-- ════════════════════════════════════════════════════════════════
-- Migratie 047: ICP-score op prospects. De kwalificatie geeft nu een
-- score 0-100 op Menno's echte doelgroep (founders/coaches die al
-- content maken, >€20k/mnd draaien en YouTube laten liggen). Onder
-- de 65 = afgekeurd; de score blijft staan zodat je kunt sorteren.
-- ════════════════════════════════════════════════════════════════
alter table prospects add column if not exists icp_score int;
create index if not exists idx_prospects_icp on prospects (agency_id, stage, icp_score desc);
