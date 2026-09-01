-- Greenfield cleanup: keep platform plans, remove the historical demo tenant created by the transitional migration.
DELETE FROM `tenantsubscription`
WHERE `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';

DELETE FROM `tenantdomain`
WHERE `tenantId` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';

DELETE FROM `tenant`
WHERE `id` = '0f4f155e-54f3-47fd-9aba-1be4e390061e';

UPDATE `plan`
SET `description` = 'Plan completo de OnlyPadel'
WHERE `id` = '2f4f155e-54f3-47fd-9aba-1be4e390061e';
