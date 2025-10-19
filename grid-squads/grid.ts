

import 'dotenv/config';
import { CompleteAuthResponse, GridClient, GridClientUserContext, SessionSecrets, SpendingLimitPeriod, SpendingLimitRequest, SplTransfer, TransactionPayload } from "@sqds/grid";
import savedAuthResult from "./authResult.json"
import savedSessionSecrets from "./sessionSecret.json"
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
import wallet from "../PsVDCuwtGVSHswAw1qvTGdNaQrUkKVHKkKpBnRV4t52.json"
// import { buildGatewayTransactionn, sendTransaction } from '../gateway-santcum/gateway';

const useEmail = "chiemelie@gmail.com"
let gridClient: GridClient;
let sessionSecrets: SessionSecrets;
let authResult: CompleteAuthResponse;

// Note: "sandbox" runs devnet while "production" runs on mainnet

export async function client() {
    gridClient = new GridClient({
        environment: "production", // Use 'production' for live applications
        apiKey: process.env.GRID_API_KEY_PRODUCTION!, // Your API key from the dashboard
        baseUrl: "https://grid.squads.xyz", // Base URL of the Grid API
    });
    return gridClient
}
export async function generateSessionSecrets() {
    const sessionSecrets = await gridClient.generateSessionSecrets();
    console.log('Session secrets generated - these contain private keys needed for signing!');
    console.log(JSON.stringify(sessionSecrets, null, 2))
    return sessionSecrets
}

export async function gridCreateAccount(email: string) {
    console.log(process.env.GRID_API_KEY);
    // Ensure gridClient is initialized before use
    if (!gridClient) {
        throw new Error("GridClient is not initialized.");
    }
    console.log(process.env.GRID_API_KEY);
    const user = await gridClient.createAccount({
        email,
    });
    console.log('Account creation initiated for:', user);
    console.log('OTP sent to email for verification');
    return user;
}

export async function completeAuthAndCreateAccount(email: string, otpCode: string) {
    sessionSecrets = await generateSessionSecrets()
    const user: GridClientUserContext = {
        signers: [],
        email
    }

    const verifiedAccount = await gridClient.completeAuthAndCreateAccount({
        user,
        otpCode,
        sessionSecrets,
    });
    if (verifiedAccount && verifiedAccount.data) {
        authResult = verifiedAccount.data
    } else {
        throw Error("not working")
    }
    console.log('Account created successfully', JSON.stringify(verifiedAccount, null, 2));
    return verifiedAccount;
}


export async function OTPForExistingAccount(email: string) {

    // Initialize authentication for existing account
    const authUser = await gridClient.initAuth({
        email,
    });
    console.log('Authentication initiated for:', authUser.data);
}

export async function AuthenticateExistingAccount(email: string, otpCode: string) {
    sessionSecrets = await generateSessionSecrets()
    if (!sessionSecrets) {
        console.log("session Secrets not found")
        return
    }
    const user: GridClientUserContext = {
        signers: [],
        email
    }

    // Complete authentication with OTP
    const resAuthResult = await gridClient.completeAuth({
        otpCode,
        user,
        sessionSecrets,
    });

    if (resAuthResult && resAuthResult.data) {
        authResult = resAuthResult.data
    } else {
        throw Error("not working")
    }

    console.log('Account authenticated successfully', JSON.stringify(authResult, null, 2));

    return { authResult, sessionSecrets }
}


export async function executeTransaction() {

    try {
        const feePayer = Keypair.fromSecretKey(new Uint8Array(wallet))
        const connection = new Connection(process.env.RPC || "")

        const mintAddress = new PublicKey("3yGZMxqt6kLUSHhZEbTgnTnvGxn2BhH3aqs7aiac2tF2")
        const sourceWallet = new PublicKey(authResult.address)
        const user = new PublicKey("PsVDCuwtGVSHswAw1qvTGdNaQrUkKVHKkKpBnRV4t52")

        // 1. Build your SPL transfer transaction (using @solana/web3.js)
        const tx = new Transaction()
        const sourceAccountAta = await getAssociatedTokenAddress(mintAddress, sourceWallet, true);
        const destinationAccountAta = await getAssociatedTokenAddress(mintAddress, user);

        // const destinationAccount = await connection.getAccountInfo(destinationAccountAta);

        // // Create destination ATA if it does not exist
        //         if (!destinationAccount) {
        //             tx.add(createAssociatedTokenAccountInstruction(
        //                 merchant.publicKey,
        //                 destinationAccountAta,
        //                 user,
        //                 mintAddress
        //             ));
        //         }

        tx.add(createTransferInstruction(
            sourceAccountAta,
            destinationAccountAta,
            sourceWallet,
            100
        ));

        tx.feePayer = sourceWallet

        const latestBlockHash = await connection.getLatestBlockhash({ commitment: "confirmed" });
        tx.recentBlockhash = latestBlockHash.blockhash;

        const transaction = tx.serialize({ requireAllSignatures: false }).toString('base64')


        const gridtx = await gridClient.prepareArbitraryTransaction(
            authResult.address,
            {
                transaction,
                fee_config: {
                    currency: 'sol', // or 'usdc'
                    payer_address: authResult.address
                }
            }
        );

        console.log(gridtx)
        if (!gridtx?.data) {
            throw new Error("verifiedAccount.data.address is undefined");
        }
        console.log("opppppppppppppppppppppppppppppppppppppppppppppppppppppp")
        // 2. Prepare the transaction
        const transactionPayload: TransactionPayload = gridtx.data


        // const trxx: string = await buildGatewayTransactionn(gridtx.data.transaction)

        // Sign with managed authentication
        const transactionResult = await gridClient.signAndSend({
            sessionSecrets, // From account creation step
            session: authResult.authentication, // Auth token from previous step
            transactionPayload: transactionPayload, // Transaction data from spending limit creation
            address: authResult.address
        });

 console.log("opppppppppppppppppppppppppppppppppppppppppppppppppppppp", transactionResult)
        // If transactionResult.transaction.messageBytes exists and is of type TransactionMessageBytes, use it

        // const signature = await sendTransaction(transactionResult.transaction);

 console.log("opppppppppppppppppppppppppppppppppppppppppppppppppppppp")
        // console.log("Transaction executed successfully!");
        // console.log("Signature:", signature);

    } catch (error) {
        console.error('Transaction error:', error);
        return
    }

}

export async function verifyTransaction() {
    // Get current account balances
    const balances = await gridClient.getAccountBalances(authResult.address);
    if (!balances?.data) {
        throw new Error("balance not found");
    }

    console.log("Account balances:");
    console.log("Sol balance:", balances.data.sol);
    balances.data.tokens.forEach((balance) => {
        console.log(`${balance.token_address}: ${balance.amount} (${balance.symbol})`);
    });

    // Get recent transaction history
    const transfers = await gridClient.getTransfers(authResult.address, {
        payment_rail: "solana",
        limit: 10,
        status: "payment_processed",
    });
    if (!transfers?.data) {
        throw new Error("transfers not found");
    }
    console.log("Recent transactions:");
    console.log(transfers?.data);

    // transfers.data.forEach((transfer) => {
    //     console.log(`${transfer.amount} ${transfer.token_address} - ${transfer.confirmation_status}`);
    //     console.log(`Signature: ${transfer.signature}`);
    // });

    // Check current spending limits
    // const spendingLimits = await gridClient.getSpendingLimits(authResult.address);

    // console.log("Active spending limits:");
    // spendingLimits.data.forEach((limit) => {
    //     console.log(`${limit.amount} ${limit.symbol} per ${limit.period}`);
    //     console.log(`Remaining: ${limit.remainingAmount}`);
    // });
}

async function isActive(timestamp: number) {

    const now = Date.now();
console.log(timestamp, now);
    if (timestamp > now) {
        console.log("Active");
        return true
    } else {
        console.log("Expired");
        return false
    }
}

async function run() {
    await client() // must run before others 

    // For new Users
    // await gridCreateAccount(useEmail) // to get the code
    // await completeAuthAndCreateAccount(useEmail, "763045")// add the code here

    // For Old Users 
    // await OTPForExistingAccount(useEmail) // to get the code
    // await AuthenticateExistingAccount(useEmail, "615464") // add the code here

    // use if you have saved them locally
    authResult = savedAuthResult as any
    sessionSecrets = savedSessionSecrets as any

    const use: any = authResult
    console.log( use.authentication[0].session?.Privy?.session.expires_at)

    isActive(use.authentication[0].session?.Privy?.session.expires_at)
    // console.log( [...savedSessionSecrets])
    await executeTransaction()
    // await verifyTransaction()

}

run()

