-- CreateTable
CREATE TABLE "Appointment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "confirmationNumber" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "parentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "bookedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RefillRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "refillId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "dob" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "pharmacyName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GeneralMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageId" TEXT NOT NULL,
    "callerName" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "reasonForCall" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "callId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "CallLog_callId_key" ON "CallLog"("callId");
