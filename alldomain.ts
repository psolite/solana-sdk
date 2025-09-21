import { TldParser, NameRecordHeader } from "@onsol/tldparser";
import { Connection, PublicKey } from "@solana/web3.js";

const RPC_URL = process.env.RPC || "https://api.mainnet-beta.solana.com";

// initialize a Solana Connection
const connection = new Connection(RPC_URL, 'confirmed');

// get all the domains owned by a public key
export async function getOwnedDomains(owner: PublicKey) {
    try {
        console.log("IN")
        // initialize a Tld Parser
        const parser = new TldParser(connection);

        // get all owned domains
        let allUserDomains = await parser.getParsedAllUserDomains(owner);

        const userDomain = allUserDomains.length > 0
            ? `${'nameAccount' in allUserDomains[0] ? allUserDomains[0].nameAccount : allUserDomains[0].address}.${allUserDomains[0].domain}` : null
        console.log("ttttttttttttttttttttttttttttttttttttttttttttttttttttttttttttt", allUserDomains)
        return userDomain;
    } catch (error) {
        console.log("yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy", error)
        return null
    }
}

// get all owned domains
getOwnedDomains(new PublicKey("8uWDnoXaicAUBZwHdPGUprKLHJVvGEB6BvRdbxKFvT9R"));
