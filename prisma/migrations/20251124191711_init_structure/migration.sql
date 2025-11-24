-- CreateTable
CREATE TABLE "integration"."events" (
    "event_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_time" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "amount" DECIMAL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "integration"."error_logs" (
    "error_id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "event_id" TEXT,
    "error_code" TEXT,
    "stack_trace" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("error_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_external_id_key" ON "integration"."events"("external_id");

-- CreateIndex
CREATE INDEX "events_external_id_idx" ON "integration"."events"("external_id");

-- CreateIndex
CREATE INDEX "events_event_time_idx" ON "integration"."events"("event_time");

-- CreateIndex
CREATE INDEX "events_source_event_type_idx" ON "integration"."events"("source", "event_type");

-- CreateIndex
CREATE INDEX "events_created_at_idx" ON "integration"."events"("created_at" DESC);

-- CreateIndex
CREATE INDEX "events_payload_idx" ON "integration"."events" USING GIN ("payload");

-- CreateIndex
CREATE INDEX "error_logs_level_idx" ON "integration"."error_logs"("level");

-- CreateIndex
CREATE INDEX "error_logs_context_idx" ON "integration"."error_logs"("context");

-- CreateIndex
CREATE INDEX "error_logs_created_at_idx" ON "integration"."error_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "error_logs_event_id_idx" ON "integration"."error_logs"("event_id");
