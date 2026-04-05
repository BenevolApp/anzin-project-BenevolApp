-- ============================================================
-- STORY 3.3 — Cascade liste d'attente
-- Trigger PL/pgSQL : quand un bénévole accepté se désiste,
-- le premier en liste d'attente est automatiquement promu.
-- ============================================================
-- Appliquer via : Supabase SQL Editor → New query → Run

-- ============================================================
-- FONCTION : cascade_waitlist()
-- Déclenchée AFTER UPDATE sur mission_applications
-- Condition : status passe de 'accepted' à 'rejected' (désistement)
-- ============================================================
CREATE OR REPLACE FUNCTION cascade_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  next_app RECORD;
BEGIN
  -- On agit uniquement quand un 'accepted' devient 'rejected'
  IF OLD.status = 'accepted' AND NEW.status = 'rejected' THEN

    -- Trouver le premier en liste d'attente pour cette mission
    SELECT * INTO next_app
    FROM mission_applications
    WHERE mission_id = NEW.mission_id
      AND status = 'waitlisted'
    ORDER BY position ASC
    LIMIT 1;

    IF FOUND THEN
      -- Promouvoir : passer à 'accepted', effacer la position
      UPDATE mission_applications
      SET status = 'accepted', position = NULL
      WHERE id = next_app.id;

      -- Renuméroter les positions restantes sur la liste d'attente
      UPDATE mission_applications
      SET position = position - 1
      WHERE mission_id = NEW.mission_id
        AND status = 'waitlisted'
        AND position > next_app.position;

      -- Envoyer une notification à l'heureux élu
      -- (organisation_id récupéré depuis la mission)
      INSERT INTO notifications (user_id, organisation_id, type, title, message, is_human)
      SELECT
        next_app.benevole_id,
        m.organisation_id,
        'waitlist_promoted',
        'Vous êtes accepté(e) !',
        'Une place s''est libérée : vous avez été retenu(e) pour la mission "' || m.title || '".',
        false
      FROM missions m
      WHERE m.id = NEW.mission_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER sur mission_applications
-- ============================================================
DROP TRIGGER IF EXISTS trg_cascade_waitlist ON mission_applications;

CREATE TRIGGER trg_cascade_waitlist
  AFTER UPDATE OF status ON mission_applications
  FOR EACH ROW
  EXECUTE FUNCTION cascade_waitlist();
