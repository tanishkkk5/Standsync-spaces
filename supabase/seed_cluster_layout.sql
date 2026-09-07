-- StandSync Spaces — seed_cluster_layout.sql
-- Run AFTER migration_005. Clears old seats and creates a Skedda-style layout.

DO $$
DECLARE
  o_id uuid;
  c_id uuid;
  sn   int;
  nseats int;
  r    record;
BEGIN

-- ══ OFFICE 1 ══════════════════════════════════════════════════════════════
SELECT id INTO o_id FROM spaces_offices WHERE name LIKE '%Office 1%' LIMIT 1;
IF o_id IS NULL THEN RAISE NOTICE 'Office 1 not found — skipping'; RETURN; END IF;

DELETE FROM spaces_seats        WHERE office_id = o_id;
DELETE FROM spaces_clusters     WHERE office_id = o_id;
DELETE FROM spaces_layout_blocks WHERE office_id = o_id;
DELETE FROM spaces_zones         WHERE office_id = o_id;

INSERT INTO spaces_zones (office_id, label, x, y, w, h, color) VALUES
  (o_id, 'MARKETING', 58,  4, 40, 47, 'rgba(59,158,255,0.07)'),
  (o_id, 'FINANCE',   42, 52, 40, 44, 'rgba(16,185,129,0.07)'),
  (o_id, 'SALES',      6, 52, 34, 44, 'rgba(245,158,11,0.07)');

INSERT INTO spaces_layout_blocks (office_id, block_type, x, y, w, h, label) VALUES
  (o_id, 'room',      14,  2, 26, 22, 'Meeting Room'),
  (o_id, 'sitting',   44, 10, 12, 28, 'Lounge'),
  (o_id, 'entrance',   0, 36,  2, 16, 'ENTRY'),
  (o_id, 'entrance',  98, 58,  2, 16, 'ENTRY');

sn := 0;
FOR r IN (
  SELECT cx, cy, ct FROM (VALUES
    ( 6::real, 16::real, 'round4'::text),
    ( 6::real, 38::real, 'round4'::text),
    (65::real, 15::real, '4'::text),
    (79::real, 15::real, '4'::text),
    (93::real, 15::real, '4'::text),
    (65::real, 34::real, '4'::text),
    (79::real, 34::real, '4'::text),
    (93::real, 34::real, '4'::text),
    (51::real, 65::real, '4'::text),
    (65::real, 65::real, '4'::text),
    (79::real, 65::real, '4'::text),
    (51::real, 83::real, '4'::text),
    (65::real, 83::real, '4'::text),
    (79::real, 83::real, '4'::text),
    (14::real, 65::real, '4'::text),
    (28::real, 65::real, '4'::text),
    (14::real, 83::real, '4'::text),
    (28::real, 83::real, '4'::text)
  ) AS t(cx, cy, ct)
) LOOP
  INSERT INTO spaces_clusters (office_id, cx, cy, cluster_type)
  VALUES (o_id, r.cx, r.cy, r.ct) RETURNING id INTO c_id;

  nseats := CASE r.ct
    WHEN 'round4' THEN 4 WHEN 'round2' THEN 2
    WHEN '2h' THEN 2 WHEN '2v' THEN 2
    WHEN '4' THEN 4 WHEN '6' THEN 6 WHEN '8' THEN 8 ELSE 4 END;

  FOR i IN 0..(nseats-1) LOOP
    sn := sn + 1;
    INSERT INTO spaces_seats (office_id, cluster_id, cluster_pos, seat_number, cx, cy, occupied)
    VALUES (o_id, c_id, i, 'B1-' || LPAD(sn::text, 2, '0'), r.cx, r.cy, false);
  END LOOP;
END LOOP;

-- ══ OFFICE 2 ══════════════════════════════════════════════════════════════
SELECT id INTO o_id FROM spaces_offices WHERE name LIKE '%Office 2%' LIMIT 1;
IF o_id IS NULL THEN RAISE NOTICE 'Office 2 not found — skipping'; RETURN; END IF;

DELETE FROM spaces_seats         WHERE office_id = o_id;
DELETE FROM spaces_clusters      WHERE office_id = o_id;
DELETE FROM spaces_layout_blocks WHERE office_id = o_id;
DELETE FROM spaces_zones          WHERE office_id = o_id;

INSERT INTO spaces_zones (office_id, label, x, y, w, h, color) VALUES
  (o_id, 'ENGINEERING',  6,  4, 44, 47, 'rgba(99,102,241,0.07)'),
  (o_id, 'QA',           6, 52, 44, 44, 'rgba(239,68,68,0.07)'),
  (o_id, 'DESIGN',      52,  4, 46, 44, 'rgba(245,158,11,0.07)');

INSERT INTO spaces_layout_blocks (office_id, block_type, x, y, w, h, label) VALUES
  (o_id, 'room',     55, 52, 24, 22, 'Meeting Room'),
  (o_id, 'sitting',  55, 74, 24, 20, 'Pantry'),
  (o_id, 'entrance',  0, 36,  2, 16, 'ENTRY'),
  (o_id, 'entrance', 98, 36,  2, 16, 'ENTRY');

sn := 0;
FOR r IN (
  SELECT cx, cy, ct FROM (VALUES
    ( 6::real, 16::real, 'round4'::text),
    (15::real, 16::real, '4'::text),
    (29::real, 16::real, '4'::text),
    (43::real, 16::real, '4'::text),
    (15::real, 35::real, '4'::text),
    (29::real, 35::real, '4'::text),
    (43::real, 35::real, '4'::text),
    (15::real, 65::real, '4'::text),
    (29::real, 65::real, '4'::text),
    (43::real, 65::real, '4'::text),
    (15::real, 83::real, '4'::text),
    (29::real, 83::real, '4'::text),
    (63::real, 15::real, '4'::text),
    (77::real, 15::real, '4'::text),
    (91::real, 15::real, '4'::text),
    (63::real, 34::real, '4'::text),
    (77::real, 34::real, '4'::text),
    (91::real, 34::real, '4'::text)
  ) AS t(cx, cy, ct)
) LOOP
  INSERT INTO spaces_clusters (office_id, cx, cy, cluster_type)
  VALUES (o_id, r.cx, r.cy, r.ct) RETURNING id INTO c_id;

  nseats := CASE r.ct
    WHEN 'round4' THEN 4 WHEN 'round2' THEN 2
    WHEN '2h' THEN 2 WHEN '2v' THEN 2
    WHEN '4' THEN 4 WHEN '6' THEN 6 WHEN '8' THEN 8 ELSE 4 END;

  FOR i IN 0..(nseats-1) LOOP
    sn := sn + 1;
    INSERT INTO spaces_seats (office_id, cluster_id, cluster_pos, seat_number, cx, cy, occupied)
    VALUES (o_id, c_id, i, 'B2-' || LPAD(sn::text, 2, '0'), r.cx, r.cy, false);
  END LOOP;
END LOOP;

END $$;
