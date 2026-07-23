# FlowMark

FlowMark is a lightweight onchain focus log for Base mainnet. A user connects a
wallet, chooses a focus mode and duration, then marks the session onchain. The
app also includes a daily onchain check-in with streak tracking. There are no
tokens, paid app actions, NFTs, subscriptions, or backend services. The only
user cost is Base gas for calling `mark(uint8,uint16)` or `checkIn()`.

## What is inside

- `contracts/FlowMark.sol` - the Solidity contract for Remix.
- `src/` - the React + Vite app.
- `src/config/wagmi.ts` - Base mainnet wallet configuration with Builder Code.
- `src/config/contract.ts` - ABI and contract address loading.
- `netlify.toml` - Netlify build settings.
- `.env.example` - the frontend environment variable template.

## Deploy the contract with Remix

1. Open [Remix](https://remix.ethereum.org/).
2. Create a new file named `FlowMark.sol`.
3. Paste the full contents of `contracts/FlowMark.sol`.
4. Open the Solidity Compiler tab.
5. Select compiler `0.8.24`.
6. Keep optimization disabled unless you verify with the exact same settings.
7. Compile `FlowMark.sol`.
8. Open the Deploy & Run Transactions tab.
9. Set Environment to `Injected Provider - MetaMask` or your wallet.
10. Switch your wallet to Base mainnet.
11. Deploy `FlowMark`.
12. Copy the deployed contract address.

## Verify on BaseScan

1. Open [BaseScan contract verification](https://basescan.org/verifyContract).
2. Paste the deployed contract address.
3. Select `Solidity (Single file)`.
4. Select compiler `v0.8.24+commit.e11b9ed9`.
5. Select license `MIT`.
6. Select optimization `No` if you followed the Remix steps above.
7. Paste the full `contracts/FlowMark.sol` source code.
8. Constructor arguments can stay empty because this contract has no constructor.
9. Submit verification.

## Configure the frontend

Create `.env` from the example:

```bash
cp .env.example .env
```

Then replace the zero address:

```bash
VITE_FLOWMARK_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

You can also hardcode a fallback address in `src/config/contract.ts` after
deployment if you do not want to use Netlify environment variables.

## Base App metadata

After Base.dev gives you a meta tag like this:

```html
<meta name="base:app_id" content="YOUR_APP_ID" />
```

paste it inside the `<head>` element in `index.html`, before `<title>`.

## Builder Code attribution

This app is configured with the Base Builder Code:

```bash
bc_cjf3rp0g
```

`src/config/wagmi.ts` creates a `dataSuffix` with `ox/erc8021`, and
`src/App.tsx` also passes that suffix directly into every `writeContract` call.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The production files will be in `dist/`.

## Contract modes and durations

Modes:

- `0` - Build
- `1` - Study
- `2` - Read
- `3` - Plan
- `4` - Practice
- `5` - Reset

Allowed durations:

- `15`
- `25`
- `45`
- `60`
- `90`

## Daily check-in

Users can call `checkIn()` once per UTC day. The contract stores:

- total user check-ins
- current user check-in streak
- last check-in day
- global check-in count
