-- AlterTable
ALTER TABLE "User" ADD COLUMN "last_name" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rx_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "drug_code" TEXT NOT NULL,
    "drug_name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "expiry_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "medications_json" TEXT,
    "notes" TEXT,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "is_disputed" BOOLEAN NOT NULL DEFAULT false,
    "is_reviewed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Prescription_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Prescription_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Prescription" ("created_at", "doctor_id", "dosage", "drug_code", "drug_name", "duration_days", "expiry_date", "frequency", "id", "is_disputed", "is_flagged", "patient_id", "rx_id", "status", "updated_at") SELECT "created_at", "doctor_id", "dosage", "drug_code", "drug_name", "duration_days", "expiry_date", "frequency", "id", "is_disputed", "is_flagged", "patient_id", "rx_id", "status", "updated_at" FROM "Prescription";
DROP TABLE "Prescription";
ALTER TABLE "new_Prescription" RENAME TO "Prescription";
CREATE UNIQUE INDEX "Prescription_rx_id_key" ON "Prescription"("rx_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
