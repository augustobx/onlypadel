-- DropForeignKey
ALTER TABLE `booking` DROP FOREIGN KEY `Booking_courtId_fkey`;

-- DropForeignKey
ALTER TABLE `businesshour` DROP FOREIGN KEY `BusinessHour_courtId_fkey`;

-- DropForeignKey
ALTER TABLE `courtblock` DROP FOREIGN KEY `CourtBlock_courtId_fkey`;

-- DropForeignKey
ALTER TABLE `fixedbooking` DROP FOREIGN KEY `FixedBooking_courtId_fkey`;

-- DropForeignKey
ALTER TABLE `tournamentcategory` DROP FOREIGN KEY `TournamentCategory_tournamentId_fkey`;

-- DropForeignKey
ALTER TABLE `tournamentgroup` DROP FOREIGN KEY `TournamentGroup_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `tournamentgroupteam` DROP FOREIGN KEY `TournamentGroupTeam_groupId_fkey`;

-- DropForeignKey
ALTER TABLE `tournamentmatch` DROP FOREIGN KEY `TournamentMatch_categoryId_fkey`;

-- DropIndex
DROP INDEX `Booking_courtId_startTime_endTime_idx` ON `booking`;

-- DropIndex
DROP INDEX `BusinessHour_courtId_dayOfWeek_key` ON `businesshour`;

-- DropIndex
DROP INDEX `CourtBlock_courtId_startTime_endTime_idx` ON `courtblock`;

-- DropIndex
DROP INDEX `FixedBooking_courtId_dayOfWeek_idx` ON `fixedbooking`;

-- DropIndex
DROP INDEX `TournamentCategory_tournamentId_name_key` ON `tournamentcategory`;

-- DropIndex
DROP INDEX `TournamentGroup_categoryId_name_key` ON `tournamentgroup`;

-- DropIndex
DROP INDEX `TournamentGroupTeam_groupId_teamId_key` ON `tournamentgroupteam`;

-- DropIndex
DROP INDEX `TournamentMatch_categoryId_round_matchOrder_idx` ON `tournamentmatch`;

-- DropIndex
DROP INDEX `User_dni_key` ON `user`;

-- DropIndex
DROP INDEX `User_email_key` ON `user`;

-- AlterTable
ALTER TABLE `booking` ADD COLUMN `requestKey` VARCHAR(64) NULL,
    ADD COLUMN `slotKey` VARCHAR(128) NULL,
    ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `businesshour` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `court` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `courtblock` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `expense` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `fixedbooking` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `pushsubscription` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `setting` DROP PRIMARY KEY,
    ADD COLUMN `id` VARCHAR(191) NOT NULL,
    ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `systemsetting` DROP PRIMARY KEY,
    ADD COLUMN `rankingsEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `whatsappPhoneId` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `whatsappToken` TEXT NOT NULL DEFAULT '',
    ADD COLUMN `whatsappVerifyToken` VARCHAR(191) NOT NULL DEFAULT '',
    MODIFY `topbarName` VARCHAR(191) NOT NULL DEFAULT 'OnlyPadel',
    MODIFY `adminUser` VARCHAR(191) NOT NULL DEFAULT '',
    MODIFY `adminPass` VARCHAR(191) NOT NULL DEFAULT '',
    MODIFY `splashLogo` VARCHAR(191) NOT NULL DEFAULT 'OnlyPadel',
    MODIFY `splashName` VARCHAR(191) NOT NULL DEFAULT 'OnlyPadel',
    ADD PRIMARY KEY (`tenantId`);

-- AlterTable
ALTER TABLE `tournament` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    MODIFY `status` ENUM('DRAFT', 'REGISTRATION', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED') NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE `tournamentcategory` ADD COLUMN `isZonesPublished` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `tournamentgroup` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `tournamentgroupteam` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `tournamentmatch` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `tournamentteam` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `tenantId` VARCHAR(191) NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE `tenant` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `timezone` VARCHAR(80) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `archivedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Tenant_slug_key`(`slug`),
    INDEX `Tenant_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- The historical installation becomes the first isolated tenant.
INSERT INTO `tenant` (`id`, `slug`, `name`, `status`, `timezone`, `createdAt`, `updatedAt`)
VALUES ('0f4f155e-54f3-47fd-9aba-1be4e390061e', 'pescadores-padel', 'Pescadores Padel', 'ACTIVE', 'America/Argentina/Buenos_Aires', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- CreateTable
CREATE TABLE `tenantdomain` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    `hostname` VARCHAR(255) NOT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TenantDomain_hostname_key`(`hostname`),
    INDEX `TenantDomain_tenantId_isPrimary_idx`(`tenantId`, `isPrimary`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `tenantdomain` (`id`, `tenantId`, `hostname`, `isPrimary`, `verifiedAt`, `createdAt`, `updatedAt`)
VALUES ('1f4f155e-54f3-47fd-9aba-1be4e390061e', '0f4f155e-54f3-47fd-9aba-1be4e390061e', 'pescadores-padel.onlypadel.nanoapps.ar', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- CreateTable
CREATE TABLE `platformuser` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPERADMIN', 'SUPPORT') NOT NULL DEFAULT 'SUPERADMIN',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlatformUser_email_key`(`email`),
    INDEX `PlatformUser_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platformsession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PlatformSession_tokenHash_key`(`tokenHash`),
    INDEX `PlatformSession_userId_expiresAt_idx`(`userId`, `expiresAt`),
    INDEX `PlatformSession_expiresAt_revokedAt_idx`(`expiresAt`, `revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `currency` CHAR(3) NOT NULL DEFAULT 'ARS',
    `billingInterval` VARCHAR(24) NOT NULL DEFAULT 'MONTHLY',
    `limits` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Plan_code_key`(`code`),
    INDEX `Plan_isActive_isPublic_idx`(`isActive`, `isPublic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `plan` (`id`, `code`, `name`, `description`, `price`, `currency`, `billingInterval`, `isActive`, `isPublic`, `createdAt`, `updatedAt`)
VALUES ('2f4f155e-54f3-47fd-9aba-1be4e390061e', 'PRO', 'Pro', 'Plan completo migrado para el tenant histórico', 60000, 'ARS', 'MONTHLY', true, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- CreateTable
CREATE TABLE `planfeature` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(80) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `config` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlanFeature_key_enabled_idx`(`key`, `enabled`),
    UNIQUE INDEX `PlanFeature_planId_key_key`(`planId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `planfeature` (`id`, `planId`, `key`, `enabled`, `createdAt`, `updatedAt`) VALUES
(UUID(), '2f4f155e-54f3-47fd-9aba-1be4e390061e', 'reservations', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), '2f4f155e-54f3-47fd-9aba-1be4e390061e', 'users', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), '2f4f155e-54f3-47fd-9aba-1be4e390061e', 'tournaments', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), '2f4f155e-54f3-47fd-9aba-1be4e390061e', 'rankings', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), '2f4f155e-54f3-47fd-9aba-1be4e390061e', 'player_categories', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), '2f4f155e-54f3-47fd-9aba-1be4e390061e', 'expenses', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), '2f4f155e-54f3-47fd-9aba-1be4e390061e', 'whatsapp', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), '2f4f155e-54f3-47fd-9aba-1be4e390061e', 'push', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
(UUID(), '2f4f155e-54f3-47fd-9aba-1be4e390061e', 'payments', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- CreateTable
CREATE TABLE `tenantsubscription` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    `planId` VARCHAR(191) NOT NULL,
    `status` ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED') NOT NULL DEFAULT 'TRIAL',
    `startsAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `trialEndsAt` DATETIME(3) NULL,
    `currentPeriodStart` DATETIME(3) NULL,
    `currentPeriodEnd` DATETIME(3) NULL,
    `canceledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TenantSubscription_tenantId_status_periodEnd_idx`(`tenantId`, `status`, `currentPeriodEnd`),
    INDEX `TenantSubscription_planId_status_idx`(`planId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `tenantsubscription` (`id`, `tenantId`, `planId`, `status`, `startsAt`, `currentPeriodStart`, `currentPeriodEnd`, `createdAt`, `updatedAt`)
VALUES ('3f4f155e-54f3-47fd-9aba-1be4e390061e', '0f4f155e-54f3-47fd-9aba-1be4e390061e', '2f4f155e-54f3-47fd-9aba-1be4e390061e', 'ACTIVE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3), NULL, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- CreateTable
CREATE TABLE `tenantfeatureoverride` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    `key` VARCHAR(80) NOT NULL,
    `enabled` BOOLEAN NOT NULL,
    `config` JSON NULL,
    `reason` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TenantFeatureOverride_tenantId_key_key`(`tenantId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saaspayment` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    `subscriptionId` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'ARS',
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'VOID') NOT NULL DEFAULT 'PENDING',
    `provider` VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
    `providerReference` VARCHAR(191) NULL,
    `periodStart` DATETIME(3) NULL,
    `periodEnd` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SaasPayment_tenantId_status_createdAt_idx`(`tenantId`, `status`, `createdAt`),
    UNIQUE INDEX `SaasPayment_provider_reference_key`(`provider`, `providerReference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platformauditlog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NULL,
    `action` VARCHAR(120) NOT NULL,
    `entityType` VARCHAR(80) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlatformAuditLog_tenantId_createdAt_idx`(`tenantId`, `createdAt`),
    INDEX `PlatformAuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `adminsession` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `AdminSession_tokenHash_key`(`tokenHash`),
    INDEX `AdminSession_tenantId_userId_expiresAt_idx`(`tenantId`, `userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usersession` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `UserSession_tokenHash_key`(`tokenHash`),
    INDEX `UserSession_tenantId_userId_expiresAt_idx`(`tenantId`, `userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rankingcategory` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `sortMode` ENUM('POINTS', 'MANUAL') NOT NULL DEFAULT 'POINTS',
    `showPoints` BOOLEAN NOT NULL DEFAULT true,
    `showPlayed` BOOLEAN NOT NULL DEFAULT true,
    `showWon` BOOLEAN NOT NULL DEFAULT true,
    `showLost` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RankingCategory_tenant_published_order_idx`(`tenantId`, `isPublished`, `displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rankingentry` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    `categoryId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `externalName` VARCHAR(191) NULL,
    `externalPhone` VARCHAR(191) NULL,
    `manualPosition` INTEGER NOT NULL DEFAULT 0,
    `points` INTEGER NOT NULL DEFAULT 0,
    `matchesPlayed` INTEGER NOT NULL DEFAULT 0,
    `matchesWon` INTEGER NOT NULL DEFAULT 0,
    `matchesLost` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RankingEntry_tenant_category_points_idx`(`tenantId`, `categoryId`, `points`),
    INDEX `RankingEntry_tenant_category_manual_idx`(`tenantId`, `categoryId`, `manualPosition`),
    UNIQUE INDEX `RankingEntry_tenant_category_user_key`(`tenantId`, `categoryId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `playercategorylevel` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#10b981',
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlayerCategoryLevel_tenant_published_order_idx`(`tenantId`, `isPublished`, `displayOrder`),
    UNIQUE INDEX `PlayerCategoryLevel_tenantId_name_key`(`tenantId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `playercategoryassignment` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    `levelId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `externalName` VARCHAR(191) NULL,
    `externalPhone` VARCHAR(191) NULL,
    `publicNote` TEXT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlayerCategoryAssignment_tenant_level_published_idx`(`tenantId`, `levelId`, `isPublished`),
    INDEX `PlayerCategoryAssignment_tenant_externalName_idx`(`tenantId`, `externalName`),
    UNIQUE INDEX `PlayerCategoryAssignment_tenantId_userId_key`(`tenantId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill every historical row before tenant foreign keys are enabled.
UPDATE `booking` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `businesshour` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `court` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `courtblock` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `expense` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `fixedbooking` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `pushsubscription` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `setting` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `systemsetting` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e', `adminUser` = '', `adminPass` = '';
UPDATE `tournament` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `tournamentcategory` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `tournamentgroup` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `tournamentgroupteam` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `tournamentmatch` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `tournamentteam` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';
UPDATE `user` SET `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';

-- CreateIndex
CREATE INDEX `Booking_tenantId_court_start_end_idx` ON `booking`(`tenantId`, `courtId`, `startTime`, `endTime`);

-- CreateIndex
CREATE INDEX `Booking_tenantId_status_startTime_idx` ON `booking`(`tenantId`, `status`, `startTime`);

-- CreateIndex
CREATE UNIQUE INDEX `Booking_tenantId_requestKey_key` ON `booking`(`tenantId`, `requestKey`);

-- CreateIndex
CREATE UNIQUE INDEX `Booking_tenantId_slotKey_key` ON `booking`(`tenantId`, `slotKey`);

-- CreateIndex
CREATE UNIQUE INDEX `BusinessHour_tenantId_courtId_dayOfWeek_key` ON `businesshour`(`tenantId`, `courtId`, `dayOfWeek`);

-- CreateIndex
CREATE INDEX `Court_tenantId_isActive_idx` ON `court`(`tenantId`, `isActive`);

-- CreateIndex
CREATE INDEX `CourtBlock_tenantId_court_start_end_idx` ON `courtblock`(`tenantId`, `courtId`, `startTime`, `endTime`);

-- CreateIndex
CREATE INDEX `Expense_tenantId_date_idx` ON `expense`(`tenantId`, `date`);

-- CreateIndex
CREATE INDEX `FixedBooking_tenantId_courtId_dayOfWeek_idx` ON `fixedbooking`(`tenantId`, `courtId`, `dayOfWeek`);

-- CreateIndex
CREATE INDEX `PushSubscription_tenantId_userId_idx` ON `pushsubscription`(`tenantId`, `userId`);

-- CreateIndex
CREATE UNIQUE INDEX `Setting_tenantId_key_key` ON `setting`(`tenantId`, `key`);

-- CreateIndex
CREATE INDEX `Tournament_tenantId_status_startDate_idx` ON `tournament`(`tenantId`, `status`, `startDate`);

-- CreateIndex
CREATE UNIQUE INDEX `TournamentCategory_tenant_tournament_name_key` ON `tournamentcategory`(`tenantId`, `tournamentId`, `name`);

-- CreateIndex
CREATE UNIQUE INDEX `TournamentGroup_tenant_category_name_key` ON `tournamentgroup`(`tenantId`, `categoryId`, `name`);

-- CreateIndex
CREATE UNIQUE INDEX `TournamentGroupTeam_tenant_group_team_key` ON `tournamentgroupteam`(`tenantId`, `groupId`, `teamId`);

-- CreateIndex
CREATE INDEX `TournamentMatch_tenant_category_round_order_idx` ON `tournamentmatch`(`tenantId`, `categoryId`, `round`, `matchOrder`);

-- CreateIndex
CREATE INDEX `TournamentTeam_tenantId_categoryId_idx` ON `tournamentteam`(`tenantId`, `categoryId`);

-- CreateIndex
CREATE INDEX `User_tenantId_role_isActive_idx` ON `user`(`tenantId`, `role`, `isActive`);

-- CreateIndex
CREATE UNIQUE INDEX `User_tenantId_email_key` ON `user`(`tenantId`, `email`);

-- CreateIndex
CREATE UNIQUE INDEX `User_tenantId_dni_key` ON `user`(`tenantId`, `dni`);

-- AddForeignKey
ALTER TABLE `tenantdomain` ADD CONSTRAINT `TenantDomain_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platformsession` ADD CONSTRAINT `PlatformSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `platformuser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planfeature` ADD CONSTRAINT `PlanFeature_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenantsubscription` ADD CONSTRAINT `TenantSubscription_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenantsubscription` ADD CONSTRAINT `TenantSubscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenantfeatureoverride` ADD CONSTRAINT `TenantFeatureOverride_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saaspayment` ADD CONSTRAINT `SaasPayment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saaspayment` ADD CONSTRAINT `SaasPayment_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `tenantsubscription`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platformauditlog` ADD CONSTRAINT `PlatformAuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `platformuser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `platformauditlog` ADD CONSTRAINT `PlatformAuditLog_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `adminsession` ADD CONSTRAINT `AdminSession_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `adminsession` ADD CONSTRAINT `AdminSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usersession` ADD CONSTRAINT `UserSession_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usersession` ADD CONSTRAINT `UserSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `User_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `court` ADD CONSTRAINT `Court_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `businesshour` ADD CONSTRAINT `BusinessHour_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking` ADD CONSTRAINT `Booking_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fixedbooking` ADD CONSTRAINT `FixedBooking_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courtblock` ADD CONSTRAINT `CourtBlock_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pushsubscription` ADD CONSTRAINT `PushSubscription_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expense` ADD CONSTRAINT `Expense_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `setting` ADD CONSTRAINT `Setting_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournament` ADD CONSTRAINT `Tournament_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentcategory` ADD CONSTRAINT `TournamentCategory_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentteam` ADD CONSTRAINT `TournamentTeam_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentgroup` ADD CONSTRAINT `TournamentGroup_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentgroupteam` ADD CONSTRAINT `TournamentGroupTeam_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentmatch` ADD CONSTRAINT `TournamentMatch_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rankingcategory` ADD CONSTRAINT `RankingCategory_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rankingentry` ADD CONSTRAINT `RankingEntry_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `rankingcategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rankingentry` ADD CONSTRAINT `RankingEntry_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rankingentry` ADD CONSTRAINT `RankingEntry_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `playercategorylevel` ADD CONSTRAINT `PlayerCategoryLevel_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `playercategoryassignment` ADD CONSTRAINT `PlayerCategoryAssignment_levelId_fkey` FOREIGN KEY (`levelId`) REFERENCES `playercategorylevel`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `playercategoryassignment` ADD CONSTRAINT `PlayerCategoryAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `playercategoryassignment` ADD CONSTRAINT `PlayerCategoryAssignment_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `systemsetting` ADD CONSTRAINT `SystemSetting_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Restore historical relations whose supporting indexes became tenant-scoped.
ALTER TABLE `booking` ADD CONSTRAINT `Booking_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `court`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `businesshour` ADD CONSTRAINT `BusinessHour_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `court`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `courtblock` ADD CONSTRAINT `CourtBlock_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `court`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `fixedbooking` ADD CONSTRAINT `FixedBooking_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `court`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `tournamentcategory` ADD CONSTRAINT `TournamentCategory_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tournamentgroup` ADD CONSTRAINT `TournamentGroup_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `tournamentcategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tournamentgroupteam` ADD CONSTRAINT `TournamentGroupTeam_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `tournamentgroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tournamentmatch` ADD CONSTRAINT `TournamentMatch_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `tournamentcategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
