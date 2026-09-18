-- ════════════════════════════════════════════════════════════════
-- Migratie 040: kostprijs en verkoopprijs per video.
--
-- Tot nu toe zat geld alleen op klantniveau (retainer, editor_cost) en
-- op de editor (pay_per_video). Daardoor kon je bij het inplannen van
-- een video niet zien wat díe video kost en oplevert. Vanaf nu draagt
-- elke kaart z'n eigen twee bedragen; de marge rekenen we uit en slaan
-- we nooit op.
--
-- clients.video_price is de standaard verkoopprijs per video voor die
-- klant — vult de dialoog automatisch voor, blijft per video aanpasbaar.
-- ════════════════════════════════════════════════════════════════

alter table content add column if not exists cost_price numeric;  -- wat de editor kost
alter table content add column if not exists sell_price numeric;  -- wat de klant betaalt
alter table clients add column if not exists video_price numeric; -- standaardprijs per video
