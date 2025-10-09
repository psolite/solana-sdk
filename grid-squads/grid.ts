

import 'dotenv/config';
import { CompleteAuthResponse, GridClient, GridClientUserContext, SessionSecrets, SpendingLimitPeriod, SpendingLimitRequest, SplTransfer } from "@sqds/grid";
import savedAuthResult from "./authResult.json"
import savedSessionSecrets from "./sessionSecret.json"

const useEmail = "chiemelie212x@gmail.com"
let gridClient: GridClient;
let sessionSecrets: SessionSecrets;
let authResult: CompleteAuthResponse;

// Note: "sandbox" runs devnet while "production" runs on mainnet

export async function client() {
    gridClient = new GridClient({
        environment: "sandbox", // Use 'production' for live applications
        apiKey: process.env.GRID_API_KEY!, // Your API key from the dashboard
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
    console.log('Account created successfully', verifiedAccount);
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

    return {authResult, sessionSecrets}
}


export async function executeTransaction() {

    try {
        const spendingLimitPayload: SpendingLimitRequest = {
            amount: 100000, // eg 0.1 USDC (USDC uses 6 decimal places)
            mint: "3hA3XL7h84N1beFWt3gwSRCDAf5kwZu81Mf1cpUHKzce", // USDC token mint
            period: "one_time", // Options: 'one_time' | 'daily' | 'weekly' | 'monthly';
            destinations: ["GTjTKnQqo5oreKK1hanQgnE3tnL2hN4xxdLoDf9n8WMD"], // Replace with actual destination
            spending_limit_signers: [authResult.address]
        };

        const result = await gridClient.createSpendingLimit(
            authResult.address,
            spendingLimitPayload
        );
        console.log(result)
        if (!result?.data) {
            throw new Error("verifiedAccount.data.address is undefined");
        }
        // Sign and submit with managed authentication
        const signature = await gridClient.signAndSend({
            sessionSecrets, // From account creation step
            session: authResult.authentication, // Auth token from previous step
            transactionPayload: result.data, // Transaction data from spending limit creation
            address: authResult.address, // Your account address
        });

        console.log("Transaction executed successfully!");
        console.log("Signature:", signature);

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

async function run() {
    await client() // must run before others 

    // For new Users
    // await gridCreateAccount(useEmail) // to get the code
    // await completeAuthAndCreateAccount(useEmail, "781888")// add the code here

    // For Old Users 
    // await OTPForExistingAccount(useEmail) // to get the code
    // await AuthenticateExistingAccount(useEmail, "163484") // add the code here

    // use if you have saved them locally
    authResult = savedAuthResult as any 
    sessionSecrets = savedSessionSecrets as any 

    console.log( [...savedSessionSecrets])
    await executeTransaction()
    await verifyTransaction()
}

run()

