// candyData.js
const fs = require("fs");
const path = require("path");

const candyFile = path.join(__dirname, "data", "candy.json");

// Read full candy.json
function readCandy() {
    if (!fs.existsSync(candyFile)) fs.writeFileSync(candyFile, JSON.stringify({}));
    return JSON.parse(fs.readFileSync(candyFile, "utf8"));
}

// Write full candy.json
function writeCandy(data) {
    fs.writeFileSync(candyFile, JSON.stringify(data, null, 2));
}

// Ensure user exists
function ensureCandyUser(userId) {
    const candyData = readCandy();
    if (!candyData[userId]) {
        candyData[userId] = { candy: 0, pets: [], bank: 0 }; // ✅ added bank
        writeCandy(candyData);
    } else {
        // In case old users don’t have bank yet
        if (candyData[userId].bank === undefined) {
            candyData[userId].bank = 0;
            writeCandy(candyData);
        }
    }
    return candyData[userId];
}

// ===== Wallet Functions =====

// Get candy amount (wallet)
function getCandy(userId) {
    const candyData = readCandy();
    return candyData[userId]?.candy || 0;
}

// Add candy to wallet
function addCandy(userId, amount) {
    const candyData = readCandy();
    if (!candyData[userId]) candyData[userId] = { candy: 0, pets: [], bank: 0 };
    candyData[userId].candy += amount;
    writeCandy(candyData);
    return candyData[userId].candy;
}

// Remove candy from wallet
function removeCandy(userId, amount) {
    const candyData = readCandy();
    if (!candyData[userId]) candyData[userId] = { candy: 0, pets: [], bank: 0 };
    candyData[userId].candy = Math.max(0, candyData[userId].candy - amount);
    writeCandy(candyData);
    return candyData[userId].candy;
}

// ===== Pet Functions =====
function addPet(userId, petName) {
    const candyData = readCandy();
    if (!candyData[userId]) candyData[userId] = { candy: 0, pets: [], bank: 0 };
    if (!candyData[userId].pets.includes(petName)) {
        candyData[userId].pets.push(petName);
        writeCandy(candyData);
    }
}

// ===== Bank Functions =====

// Get bank balance
function getBank(userId) {
    const candyData = readCandy();
    return candyData[userId]?.bank || 0;
}

// Deposit to bank
function depositBank(userId, amount) {
    const candyData = readCandy();
    if (!candyData[userId]) candyData[userId] = { candy: 0, pets: [], bank: 0 };
    amount = Math.min(amount, candyData[userId].candy); // can’t deposit more than wallet
    candyData[userId].candy -= amount;
    candyData[userId].bank += amount;
    writeCandy(candyData);
    return candyData[userId];
}

// Withdraw from bank
function withdrawBank(userId, amount) {
    const candyData = readCandy();
    if (!candyData[userId]) candyData[userId] = { candy: 0, pets: [], bank: 0 };
    amount = Math.min(amount, candyData[userId].bank); // can’t withdraw more than bank
    candyData[userId].bank -= amount;
    candyData[userId].candy += amount;
    writeCandy(candyData);
    return candyData[userId];
}

// ===== 🎃 Halloween Pet Bonuses =====
const petBonuses = {
    "Black Cat 🐈‍⬛": { type: "candyMultiplier", value: 1.1 },
    "Vampire Bat 🦇": { type: "extraCandyChance", value: 0.2 },
    "Werewolf Pup 🐺": { type: "candyMultiplier", value: 1.15 },
    "Pumpkin Spirit 🎃": { type: "extraCandyChance", value: 0.25 },
    "Ghost Dog 👻🐶": { type: "candyMultiplier", value: 1.2 },
    "Skeleton Parrot 💀🦜": { type: "extraCandyChance", value: 0.3 },
    "Cursed Wolf 🌑🐺": { type: "candyMultiplier", value: 1.3 },
    "Demon Horse 🔥🐴": { type: "candyMultiplier", value: 1.5 },
    "Zombie Cat 🧟‍⬛": { type: "candyMultiplier", value: 1.35 },
    "Haunted Raven 🪶": { type: "extraCandyChance", value: 0.35 },
    "Witch Owl 🦉": { type: "candyMultiplier", value: 1.4 },
    "Phantom Fox 👻🦊": { type: "candyMultiplier", value: 2.0 } // biggest multiplier
};

module.exports = {
    readCandy,
    writeCandy,
    ensureCandyUser,
    getCandy,
    addCandy,
    removeCandy,
    addPet,
    getBank,
    depositBank,
    withdrawBank,
    petBonuses
};