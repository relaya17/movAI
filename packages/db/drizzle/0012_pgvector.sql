DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pgvector extension unavailable — embeddings stay in jsonb';
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "movies_embedding_gin_idx" ON "movies" USING gin ("embedding");
