const { web3, BN } = require("./utils")
const Database = require('better-sqlite3')
const syncRequest = require('sync-request')

async function main() {
  try {
    let bnbPrice = 0
    try {
      const res = syncRequest('GET', 'https://api.binance.us/api/v1/ticker/price?symbol=BNBUSD')
      bnbPrice = parseFloat(JSON.parse(res.getBody('utf8')).price)
    } catch (error) {
      console.error('Request failed:', error.message);
    }
    console.log(`BNB price is ${bnbPrice}`)
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
    let total = 0
    balances.forEach(balanceItem => {
        console.log(`Updating to ${balanceItem[0]} for ${balanceItem[2]}`)
        const balanceNum = Number(balanceItem[0])
        total += balanceNum
        updateStmt.run(balanceNum, balanceItem[1], balanceItem[2])
    })
    console.log(`Total BNB: ${total}`)
    console.log(`Total USD: ${total * bnbPrice}`)
  } catch (error) {
    console.error("An unexpected error occurred:", error)
    process.exit(1)
  }
}

main().catch(error => {
  console.error("An unexpected error occurred:", error)
  process.exit(1)
})
