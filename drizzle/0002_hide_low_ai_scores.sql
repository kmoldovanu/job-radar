-- Offerte già valutate con punteggio AI sotto 20: tra le scartate (come fa ora l'app dopo ogni valutazione).
UPDATE "jobs" SET "status" = 'dismissed' WHERE "status" = 'new' AND "ai_score" IS NOT NULL AND "ai_score" < 20;
