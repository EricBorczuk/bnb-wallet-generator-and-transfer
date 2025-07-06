const { web3, BN } = require("./utils")
const Database = require('better-sqlite3')

async function main() {
  try {
    const db = new Database('bnb_wallets.db')
    const walletRows = db.prepare('SELECT * FROM wallet').all()
    const balances = []
    const nowDateStr = new Date().toISOString()
    for (const walletRow of walletRows) {
      const balance = await web3.eth.getBalance(walletRow.addr)
      const etherBalance = web3.utils.fromWei(balance, 'ether')
      balances.push([etherBalance, nowDateStr, walletRow.addr])
    }

    const updateStmt = db.prepare('update wallet set balance = ?, balance_as_of = ? where addr = ?');
    balances.forEach(balanceItem => {
        console.log(`Updating to ${balanceItem[0]} for ${balanceItem[2]}`)
        updateStmt.run(Number(balanceItem[0]), balanceItem[1], balanceItem[2])
    })
  } catch (error) {
    console.error("An unexpected error occurred:", error)
    process.exit(1)
  }
}

main().catch(error => {
  console.error("An unexpected error occurred:", error)
  process.exit(1)
})
