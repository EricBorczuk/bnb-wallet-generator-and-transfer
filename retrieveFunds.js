const { web3, BN, readWalletsWithPrivateKeys, calculateFee, performTransfer, writeDataToFile, getFormattedDateTime } = require("./utils")
const Database = require('better-sqlite3')

async function retrieveFunds(dbName, centralWalletAddress) {
  const results = []
  const db = new Database('bnb_wallets.db')
  const walletRows = db.prepare('SELECT * FROM wallet WHERE balance > 0.0002').all();
  wallets = walletRows.map(walletRow => {
    return { "address": walletRow.addr, "privateKey": walletRow.pk }
  })
  console.log(`${wallets.length} wallets with threshold balance found in database`)
  for (const wallet of wallets) {
    const balance = await web3.eth.getBalance(wallet.address)
    let skip = false;
    if (new BN(balance).isZero()) {
      console.log(`No funds to retrieve from ${wallet.address}`)
      skip = true
    }
    console.log(`Balance of ${wallet.address} is ${web3.utils.fromWei(balance, "ether")} BNB`)

    let transaction = {
      from: wallet.address,
      to: centralWalletAddress,
      value: balance,
    }

    const estimatedGas = BigInt(await web3.eth.estimateGas({ ...transaction, value: "0x0" }))
    const gasPrice = BigInt(await web3.eth.getGasPrice())
    transaction.gas = estimatedGas > BigInt(21000) ? estimatedGas : BigInt(21000)

    const fee = new BN(gasPrice).mul(new BN(transaction.gas))
    transaction.value = new BN(transaction.value).sub(fee).toString()

    if (new BN(transaction.value).lte(new BN(0))) {
      console.log(`Insufficient funds to cover the fee from ${wallet.address}`)
      skip = true
    }

    const amountTransferred = web3.utils.fromWei(transaction.value, "ether")
    const gasFee = web3.utils.fromWei(fee.toString(), "ether")
    let nonce = await web3.eth.getTransactionCount(wallet.address, "pending") // Get the current nonce
    // nonce++
    let status = "Success"
    if (!skip) {
      const receipt = await performTransfer(wallet.address, wallet.privateKey, centralWalletAddress, amountTransferred, nonce)
      if (!receipt.status) {
        console.log(`Transaction failed at ${wallet.address}, transaction hash: ${receipt.transactionHash}`)
        status = "Failure"
      }

      results.push({
        timestamp: receipt && receipt.timestamp,
        from: wallet.address,
        to: centralWalletAddress,
        transactionHash: receipt && receipt.transactionHash,
        status: status,
        amountTransferred: amountTransferred,
        gasFee: gasFee,
      })
      if (status === "Success")
        console.log(`Transferred ${amountTransferred} BNB from ${wallet.address} to ${centralWalletAddress}, TxHash: ${receipt.transactionHash}, gasFee: ${gasFee}`)
    }
  }
  return results
}

async function main() {
  const [dbName, centralWalletAddress] = process.argv.slice(2)
  if (!dbName || !centralWalletAddress) {
    console.error("Please specify the database name and the central wallet address.")
    process.exit(1)
  }

  console.log(`Using database ${dbName} as source, out to ${centralWalletAddress}`)

  try {
    const results = await retrieveFunds(dbName, centralWalletAddress)
    let format = "csv"
    if (format === "csv") {
      let content = "Timestamp,From,To,TransactionHash,Status,AmountTransferred,GasFee\n"
      results.forEach(result => {
        content += `"${result.timestamp}","${result.from}","${result.to}","${result.transactionHash}","${result.status}","${result.amountTransferred}","${result.gasFee}"\n`
      })
      // writeDataToFile("retrieveFunds-transactions", content, "csv") // Ensure proper filename for CSV
    } else {
      // writeDataToFile("retrieveFunds-transactions", results, "json") // Ensure proper filename for JSON
    }
  } catch (error) {
    console.error("An unexpected error occurred:", error.message)
    process.exit(1)
  }
}

main().catch(error => {
  console.error("An unexpected error occurred:", error.message)
  process.exit(1)
})
