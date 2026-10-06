-- CreateTable
CREATE TABLE `userpasskey` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    `userId` VARCHAR(191) NOT NULL,
    `credentialId` VARCHAR(512) NOT NULL,
    `publicKey` TEXT NOT NULL,
    `algorithm` VARCHAR(16) NOT NULL,
    `transports` JSON NULL,
    `counter` BIGINT NOT NULL DEFAULT 0,
    `authenticatorName` VARCHAR(120) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastUsedAt` DATETIME(3) NULL,

    UNIQUE INDEX `UserPasskey_tenantId_credentialId_key`(`tenantId`, `credentialId`),
    INDEX `UserPasskey_tenant_user_created_idx`(`tenantId`, `userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `passkeychallenge` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL DEFAULT '',
    `userId` VARCHAR(191) NULL,
    `kind` VARCHAR(24) NOT NULL,
    `challenge` VARCHAR(255) NOT NULL,
    `origin` VARCHAR(255) NOT NULL,
    `rpId` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PasskeyChallenge_tenant_kind_expires_idx`(`tenantId`, `kind`, `expiresAt`),
    INDEX `PasskeyChallenge_tenant_user_created_idx`(`tenantId`, `userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `userpasskey` ADD CONSTRAINT `UserPasskey_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userpasskey` ADD CONSTRAINT `UserPasskey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passkeychallenge` ADD CONSTRAINT `PasskeyChallenge_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenant`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
