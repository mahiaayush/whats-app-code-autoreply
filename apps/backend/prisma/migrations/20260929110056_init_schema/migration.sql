-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "preferredLanguage" TEXT DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'LEAD',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "chatId" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "propertyId" UUID,
    "mode" TEXT NOT NULL DEFAULT 'AI_ACTIVE',
    "language" TEXT NOT NULL DEFAULT 'en',
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "externalMessageId" TEXT,
    "sender" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_processings" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "intent" TEXT,
    "language" TEXT,
    "confidence" DOUBLE PRECISION,
    "requiresHuman" BOOLEAN NOT NULL DEFAULT false,
    "ruleMatchedId" TEXT,
    "processingTimeMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_processings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "developerName" TEXT NOT NULL,
    "reraRegistrationNumber" TEXT,
    "possessionDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_locations" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "pincode" TEXT,
    "landmark" TEXT,
    "googleMapsUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "connectivityHighlights" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "property_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_prices" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "startingPrice" BIGINT NOT NULL,
    "maxPrice" BIGINT,
    "pricePerSqFt" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "priceDisplayFormatted" TEXT NOT NULL,
    "bookingAmount" BIGINT,
    "paymentPlans" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maintenanceCharges" TEXT,

    CONSTRAINT "property_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_units" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "unitType" TEXT NOT NULL,
    "carpetAreaSqFt" INTEGER NOT NULL,
    "superBuiltUpAreaSqFt" INTEGER,
    "basePrice" BIGINT,
    "priceDisplay" TEXT,
    "floorPlanUrl" TEXT,
    "unitsAvailable" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "property_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_media" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "isHero" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "property_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_amenities" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,

    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_faqs" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "property_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_documents" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSizeBytes" INTEGER,

    CONSTRAINT "property_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_contacts" (
    "id" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "availabilityHours" TEXT,

    CONSTRAINT "property_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_responses" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "triggerMessageId" UUID,
    "responseMessageId" UUID,
    "intent" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "requiresHuman" BOOLEAN NOT NULL DEFAULT false,
    "escalationReason" TEXT,
    "latencyMs" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalations" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "messageId" UUID,
    "reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "details" TEXT,
    "confidence" DOUBLE PRECISION,
    "assignedAgentId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "human_actions" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "agentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "human_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortcuts" (
    "id" UUID NOT NULL,
    "command" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetIntent" TEXT NOT NULL,
    "naturalLanguagePhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responseTemplate" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shortcuts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "templateText" TEXT NOT NULL,
    "requiredPlaceholders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_chatId_key" ON "conversations"("chatId");

-- CreateIndex
CREATE INDEX "conversations_chatId_idx" ON "conversations"("chatId");

-- CreateIndex
CREATE INDEX "conversations_customerId_idx" ON "conversations"("customerId");

-- CreateIndex
CREATE INDEX "conversations_propertyId_idx" ON "conversations"("propertyId");

-- CreateIndex
CREATE INDEX "conversations_mode_idx" ON "conversations"("mode");

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "messages_externalMessageId_key" ON "messages"("externalMessageId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_externalMessageId_idx" ON "messages"("externalMessageId");

-- CreateIndex
CREATE INDEX "messages_sender_idx" ON "messages"("sender");

-- CreateIndex
CREATE INDEX "messages_direction_idx" ON "messages"("direction");

-- CreateIndex
CREATE INDEX "messages_timestamp_idx" ON "messages"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "message_processings_messageId_key" ON "message_processings"("messageId");

-- CreateIndex
CREATE INDEX "message_processings_status_idx" ON "message_processings"("status");

-- CreateIndex
CREATE INDEX "message_processings_intent_idx" ON "message_processings"("intent");

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");

-- CreateIndex
CREATE INDEX "properties_slug_idx" ON "properties"("slug");

-- CreateIndex
CREATE INDEX "properties_status_idx" ON "properties"("status");

-- CreateIndex
CREATE UNIQUE INDEX "property_locations_propertyId_key" ON "property_locations"("propertyId");

-- CreateIndex
CREATE INDEX "property_locations_city_idx" ON "property_locations"("city");

-- CreateIndex
CREATE UNIQUE INDEX "property_prices_propertyId_key" ON "property_prices"("propertyId");

-- CreateIndex
CREATE INDEX "property_units_propertyId_idx" ON "property_units"("propertyId");

-- CreateIndex
CREATE INDEX "property_units_unitType_idx" ON "property_units"("unitType");

-- CreateIndex
CREATE INDEX "property_media_propertyId_idx" ON "property_media"("propertyId");

-- CreateIndex
CREATE INDEX "property_media_type_idx" ON "property_media"("type");

-- CreateIndex
CREATE INDEX "property_amenities_propertyId_idx" ON "property_amenities"("propertyId");

-- CreateIndex
CREATE INDEX "property_amenities_category_idx" ON "property_amenities"("category");

-- CreateIndex
CREATE INDEX "property_faqs_propertyId_idx" ON "property_faqs"("propertyId");

-- CreateIndex
CREATE INDEX "property_documents_propertyId_idx" ON "property_documents"("propertyId");

-- CreateIndex
CREATE INDEX "property_contacts_propertyId_idx" ON "property_contacts"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_responses_triggerMessageId_key" ON "ai_responses"("triggerMessageId");

-- CreateIndex
CREATE INDEX "ai_responses_conversationId_idx" ON "ai_responses"("conversationId");

-- CreateIndex
CREATE INDEX "ai_responses_intent_idx" ON "ai_responses"("intent");

-- CreateIndex
CREATE INDEX "ai_responses_source_idx" ON "ai_responses"("source");

-- CreateIndex
CREATE INDEX "escalations_conversationId_idx" ON "escalations"("conversationId");

-- CreateIndex
CREATE INDEX "escalations_status_idx" ON "escalations"("status");

-- CreateIndex
CREATE INDEX "escalations_priority_idx" ON "escalations"("priority");

-- CreateIndex
CREATE INDEX "escalations_reason_idx" ON "escalations"("reason");

-- CreateIndex
CREATE INDEX "human_actions_conversationId_idx" ON "human_actions"("conversationId");

-- CreateIndex
CREATE INDEX "human_actions_agentId_idx" ON "human_actions"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "shortcuts_command_key" ON "shortcuts"("command");

-- CreateIndex
CREATE INDEX "shortcuts_command_idx" ON "shortcuts"("command");

-- CreateIndex
CREATE INDEX "shortcuts_targetIntent_idx" ON "shortcuts"("targetIntent");

-- CreateIndex
CREATE UNIQUE INDEX "templates_slug_key" ON "templates"("slug");

-- CreateIndex
CREATE INDEX "templates_slug_idx" ON "templates"("slug");

-- CreateIndex
CREATE INDEX "templates_intent_language_idx" ON "templates"("intent", "language");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_processings" ADD CONSTRAINT "message_processings_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_locations" ADD CONSTRAINT "property_locations_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_prices" ADD CONSTRAINT "property_prices_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_units" ADD CONSTRAINT "property_units_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_media" ADD CONSTRAINT "property_media_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_faqs" ADD CONSTRAINT "property_faqs_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_contacts" ADD CONSTRAINT "property_contacts_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_responses" ADD CONSTRAINT "ai_responses_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_responses" ADD CONSTRAINT "ai_responses_triggerMessageId_fkey" FOREIGN KEY ("triggerMessageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "human_actions" ADD CONSTRAINT "human_actions_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
