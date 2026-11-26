-- Seed: One Piece — Rumbo a Egghead (Panini). 204 cards: 1–177 and F1–F27.
INSERT INTO app.collections (slug, name)
VALUES ('rumbo-a-egghead', 'One Piece — Rumbo a Egghead');
--> statement-breakpoint
INSERT INTO app.cards (collection_id, code, sort_order)
SELECT c.id, n::text, n
FROM app.collections c, generate_series(1, 177) AS n
WHERE c.slug = 'rumbo-a-egghead';
--> statement-breakpoint
INSERT INTO app.cards (collection_id, code, sort_order)
SELECT c.id, 'F' || n, 177 + n
FROM app.collections c, generate_series(1, 27) AS n
WHERE c.slug = 'rumbo-a-egghead';
