const { ethers } = require("ethers")
// const { writeDataToFile } = require("./utils")
// const { stringify } = require("csv-stringify/sync")
const Database = require('better-sqlite3')

// Parse command-line arguments
const dbName = process.argv[2]
const numberOfWallets = process.argv.length > 3 ? parseInt(process.argv[3], 10) : 1

if (isNaN(numberOfWallets) || numberOfWallets <= 0) {
  console.error("⛔️ Error: Please provide a valid number of wallets to generate!")
  process.exit(1)
}

function generateWallet() {
  const wallet = ethers.Wallet.createRandom()
  return {
    mnemonic: wallet.mnemonic.phrase,
    privateKey: wallet.privateKey,
    walletAddress: wallet.address,
  }
}

console.log(`✨ Generating ${numberOfWallets} wallet(s)...`)
let wallets = []
let rows = []

for (let i = 0; i < numberOfWallets; i++) {
  const wallet = generateWallet()

  // Console output for each wallet
  console.log(`Wallet #${i + 1}`)
  console.log("📄 Mnemonic:", wallet.mnemonic)
  console.log("🔑 Private Key:", wallet.privateKey)
  console.log("👛 Wallet Address:", wallet.walletAddress)
  console.log("-----------------------------------")

  wallets.push(wallet)
  rows.push([wallet.mnemonic, wallet.privateKey, wallet.walletAddress])
}

// let csvContent
// // Save wallets to a file using the utility function
// if (format === "csv") {
//   csvContent = stringify(rows, { header: true, columns: ["Mnemonic", "PrivateKey", "WalletAddress"] })
//   writeDataToFile("wallets", csvContent, "csv") // Ensure proper filename for CSV
// } else {
//   writeDataToFile("wallets", wallets, "json") // Ensure proper filename for JSON
// }

// Write to a sqlite database
const db = new Database(dbName)
const insertStmt = db.prepare('INSERT INTO wallet (mnemonic, pk, addr, balance, balance_as_of, last_cashout) VALUES (?, ?, ?, ?, ?, ?)')
rows.forEach(row => {
  insertStmt.run(row[0], row[1], row[2], 0, new Date().toISOString(), '2000-01-01T00:00:00Z')
})
db.close()

console.log(`✨ Generated and saved ${numberOfWallets} wallet(s) to db.`)
