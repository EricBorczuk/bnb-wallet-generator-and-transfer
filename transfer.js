require('dotenv').config();
const { readWalletAddresses, checkBalanceAndCalculate, performTransfer, writeDataToFile } = require('./utils');

async function main() {
    const [sender, filePath, amount] = process.argv.slice(2);
    const privateKey = process.env.SENDER_PRIVATE_KEY;  // Load private key from environment variables

    if (!sender || !privateKey || !filePath || !amount) {
        console.error('Error: All arguments (sender, filePath, amount) and privateKey must be provided/set');
        return;
    }

    try {
        const wallets = readWalletAddresses(filePath);
        const { totalAmount, senderBalance } = await checkBalanceAndCalculate(sender, parseFloat(amount), wallets.length);
        console.log(`Balance: ${senderBalance}, Amount to transfer out: ${totalAmount}`);

        let transactions = [];
        for (const receiver of wallets) {
            const transaction = await performTransfer(sender, privateKey, receiver, amount);
            console.log(`Transferred ${amount} BNB to ${receiver}, TxHash: ${transaction.transactionHash}`);
            transactions.push({
                from: sender,
                to: receiver,
                amount,
                transactionHash: transaction.transactionHash,
                gasUsed: transaction.gasUsed
            });
        }
        let format = 'csv' // Default format is 'csv'
        // Save wallets to a file using the utility function
        if (format === 'csv') {
            let content = "From,To,Amount,TransactionHash,GasUsed\n";
            transactions.forEach(tx => {
                content += `"${tx.from}","${tx.to}","${tx.amount}","${tx.transactionHash}","${tx.gasUsed}"\n`;
            });
            writeDataToFile('transactions', content, 'csv');  // Ensure proper filename for CSV
        } else {
            writeDataToFile('transactions', transactions, 'json');  // Ensure proper filename for JSON
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

main().catch(console.error);
