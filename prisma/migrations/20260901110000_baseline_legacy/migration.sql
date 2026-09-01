-- CreateTable
CREATE TABLE `booking` (
    `id` VARCHAR(191) NOT NULL,
    `courtId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'BLOCKED', 'FIXED') NOT NULL DEFAULT 'PENDING',
    `paymentId` VARCHAR(191) NULL,
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(191) NULL,
    `fixedBookingId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Booking_courtId_startTime_endTime_idx`(`courtId` ASC, `startTime` ASC, `endTime` ASC),
    INDEX `Booking_fixedBookingId_fkey`(`fixedBookingId` ASC),
    INDEX `Booking_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `businesshour` (
    `id` VARCHAR(191) NOT NULL,
    `courtId` VARCHAR(191) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `openTime` VARCHAR(191) NOT NULL,
    `closeTime` VARCHAR(191) NOT NULL,
    `slotDuration` INTEGER NOT NULL DEFAULT 90,

    UNIQUE INDEX `BusinessHour_courtId_dayOfWeek_key`(`courtId` ASC, `dayOfWeek` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `court` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sport` VARCHAR(191) NOT NULL DEFAULT 'Padel',
    `surface` VARCHAR(191) NOT NULL DEFAULT 'Piso Sintético',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courtblock` (
    `id` VARCHAR(191) NOT NULL,
    `courtId` VARCHAR(191) NOT NULL,
    `startTime` DATETIME(3) NOT NULL,
    `endTime` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CourtBlock_courtId_startTime_endTime_idx`(`courtId` ASC, `startTime` ASC, `endTime` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expense` (
    `id` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `category` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fixedbooking` (
    `id` VARCHAR(191) NOT NULL,
    `courtId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `endTime` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FixedBooking_courtId_dayOfWeek_idx`(`courtId` ASC, `dayOfWeek` ASC),
    INDEX `FixedBooking_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pushsubscription` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `endpoint` TEXT NOT NULL,
    `p256dh` TEXT NOT NULL,
    `auth` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PushSubscription_userId_fkey`(`userId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `setting` (
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `systemsetting` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `clubName` VARCHAR(191) NOT NULL DEFAULT 'Padel Club',
    `contactPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `courtPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `apiPhone` VARCHAR(191) NOT NULL DEFAULT '',
    `mpAccessToken` VARCHAR(191) NOT NULL DEFAULT '',
    `reservationFee` DOUBLE NOT NULL DEFAULT 0,
    `sportEmoji` VARCHAR(191) NOT NULL DEFAULT '?',
    `topbarName` VARCHAR(191) NOT NULL DEFAULT 'T-Padel',
    `pwaEnabled` BOOLEAN NOT NULL DEFAULT true,
    `autoWhatsapp` BOOLEAN NOT NULL DEFAULT false,
    `requireDeposit` BOOLEAN NOT NULL DEFAULT true,
    `reservationsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `whatsappReservations` BOOLEAN NOT NULL DEFAULT true,
    `notifyAdmin` BOOLEAN NOT NULL DEFAULT true,
    `tournamentsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `usersModuleEnabled` BOOLEAN NOT NULL DEFAULT false,
    `requireDepositForRegistered` BOOLEAN NOT NULL DEFAULT false,
    `adminUser` VARCHAR(191) NOT NULL DEFAULT 'admin',
    `adminPass` VARCHAR(191) NOT NULL DEFAULT 'admin123',
    `splashLogo` VARCHAR(191) NOT NULL DEFAULT 'T-Padel',
    `splashName` VARCHAR(191) NOT NULL DEFAULT 'T-Padel',
    `splashDuration` INTEGER NOT NULL DEFAULT 1500,
    `bubbleActive` BOOLEAN NOT NULL DEFAULT false,
    `bubbleText` VARCHAR(191) NOT NULL DEFAULT '¡Bienvenidos al club! ?',
    `bubbleDuration` INTEGER NOT NULL DEFAULT 3000,
    `bubbleColor` VARCHAR(191) NOT NULL DEFAULT '#10b981',
    `theme` VARCHAR(191) NOT NULL DEFAULT 'light',
    `appLayout` VARCHAR(191) NOT NULL DEFAULT 'classic',
    `wspWelcome` TEXT NULL,
    `wspConfirmed` TEXT NULL,
    `wspPending` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#10b981',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#0ea5e9',
    `clientCancellations` BOOLEAN NOT NULL DEFAULT true,
    `heroImage` VARCHAR(191) NULL,

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournament` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'REGISTRATION', 'ONGOING', 'COMPLETED') NOT NULL DEFAULT 'DRAFT',
    `entryFee` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `requireDeposit` BOOLEAN NOT NULL DEFAULT false,
    `depositAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `format` ENUM('KNOCKOUT', 'ROUND_ROBIN', 'MIXED') NOT NULL DEFAULT 'KNOCKOUT',
    `maxTeams` INTEGER NULL,

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournamentcategory` (
    `id` VARCHAR(191) NOT NULL,
    `tournamentId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `level` INTEGER NULL,
    `format` ENUM('KNOCKOUT', 'ROUND_ROBIN', 'MIXED') NULL,

    UNIQUE INDEX `TournamentCategory_tournamentId_name_key`(`tournamentId` ASC, `name` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournamentgroup` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `TournamentGroup_categoryId_name_key`(`categoryId` ASC, `name` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournamentgroupteam` (
    `id` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NOT NULL,
    `teamId` VARCHAR(191) NOT NULL,
    `points` INTEGER NOT NULL DEFAULT 0,
    `matchesPlayed` INTEGER NOT NULL DEFAULT 0,
    `matchesWon` INTEGER NOT NULL DEFAULT 0,
    `matchesLost` INTEGER NOT NULL DEFAULT 0,
    `setsWon` INTEGER NOT NULL DEFAULT 0,
    `setsLost` INTEGER NOT NULL DEFAULT 0,
    `gamesWon` INTEGER NOT NULL DEFAULT 0,
    `gamesLost` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `TournamentGroupTeam_groupId_teamId_key`(`groupId` ASC, `teamId` ASC),
    INDEX `TournamentGroupTeam_teamId_fkey`(`teamId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournamentmatch` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `groupId` VARCHAR(191) NULL,
    `roundName` VARCHAR(191) NULL,
    `round` INTEGER NOT NULL,
    `matchOrder` INTEGER NOT NULL,
    `nextMatchId` VARCHAR(191) NULL,
    `team1Id` VARCHAR(191) NULL,
    `team2Id` VARCHAR(191) NULL,
    `scoreTeam1` VARCHAR(191) NULL,
    `scoreTeam2` VARCHAR(191) NULL,
    `winnerId` VARCHAR(191) NULL,
    `courtId` VARCHAR(191) NULL,
    `startTime` DATETIME(3) NULL,
    `status` ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'SCHEDULED',

    INDEX `TournamentMatch_categoryId_round_matchOrder_idx`(`categoryId` ASC, `round` ASC, `matchOrder` ASC),
    INDEX `TournamentMatch_courtId_fkey`(`courtId` ASC),
    INDEX `TournamentMatch_groupId_fkey`(`groupId` ASC),
    INDEX `TournamentMatch_team1Id_fkey`(`team1Id` ASC),
    INDEX `TournamentMatch_team2Id_fkey`(`team2Id` ASC),
    INDEX `TournamentMatch_winnerId_fkey`(`winnerId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tournamentteam` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `player1Id` VARCHAR(191) NOT NULL,
    `player2Id` VARCHAR(191) NULL,
    `isPaid` BOOLEAN NOT NULL DEFAULT false,
    `phone1` VARCHAR(191) NULL,
    `phone2` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TournamentTeam_categoryId_fkey`(`categoryId` ASC),
    INDEX `TournamentTeam_player1Id_fkey`(`player1Id` ASC),
    INDEX `TournamentTeam_player2Id_fkey`(`player2Id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `dni` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `category` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'PLAYER') NOT NULL DEFAULT 'PLAYER',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_dni_key`(`dni` ASC),
    UNIQUE INDEX `User_email_key`(`email` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `booking` ADD CONSTRAINT `Booking_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `court`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking` ADD CONSTRAINT `Booking_fixedBookingId_fkey` FOREIGN KEY (`fixedBookingId`) REFERENCES `fixedbooking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking` ADD CONSTRAINT `Booking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `businesshour` ADD CONSTRAINT `BusinessHour_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `court`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courtblock` ADD CONSTRAINT `CourtBlock_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `court`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fixedbooking` ADD CONSTRAINT `FixedBooking_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `court`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fixedbooking` ADD CONSTRAINT `FixedBooking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pushsubscription` ADD CONSTRAINT `PushSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentcategory` ADD CONSTRAINT `TournamentCategory_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentgroup` ADD CONSTRAINT `TournamentGroup_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `tournamentcategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentgroupteam` ADD CONSTRAINT `TournamentGroupTeam_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `tournamentgroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentgroupteam` ADD CONSTRAINT `TournamentGroupTeam_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `tournamentteam`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentmatch` ADD CONSTRAINT `TournamentMatch_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `tournamentcategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentmatch` ADD CONSTRAINT `TournamentMatch_courtId_fkey` FOREIGN KEY (`courtId`) REFERENCES `court`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentmatch` ADD CONSTRAINT `TournamentMatch_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `tournamentgroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentmatch` ADD CONSTRAINT `TournamentMatch_team1Id_fkey` FOREIGN KEY (`team1Id`) REFERENCES `tournamentteam`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentmatch` ADD CONSTRAINT `TournamentMatch_team2Id_fkey` FOREIGN KEY (`team2Id`) REFERENCES `tournamentteam`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentmatch` ADD CONSTRAINT `TournamentMatch_winnerId_fkey` FOREIGN KEY (`winnerId`) REFERENCES `tournamentteam`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentteam` ADD CONSTRAINT `TournamentTeam_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `tournamentcategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentteam` ADD CONSTRAINT `TournamentTeam_player1Id_fkey` FOREIGN KEY (`player1Id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tournamentteam` ADD CONSTRAINT `TournamentTeam_player2Id_fkey` FOREIGN KEY (`player2Id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
