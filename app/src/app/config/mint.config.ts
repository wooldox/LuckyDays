/**
 * The configuration of the mint app.
 * More information can be found in the documentation.
 */
export const mintConfig = {
  network: 4, // 1 = Mainnet, 4 = Rinkeby
  displayTimer: true,
  presaleStarts: 1657725158000,
  presaleEnds: 1657739558000,
  publicStarts: 1657746758000,
  publicEnd: 1657753958000,
  singleCost: 0.01,
  maxSupply: 10000,
  maxPerWallet: 3,
  contract: '0x1d254Ec366DADC15aEa94b9E8bD796dB1C2cC9F9',
  remoteList: '',
};

/**
 * The strings for success/warning/error messages.
 */
export const msgStrs = {
  connectWallet: 'Connect your wallet first',
  connectFailed: 'Failed to connect your wallet',
  switchNet: `Switch to Ethereum ${mintConfig.network == 4 ? 'Rinkeby' : 'Mainnet'}!`,
  notEnoughEth: 'Insufficient funds',
  invalidQuantity: 'Invalid quantity',
  invalidWallet: 'Invalid wallet',
  notWhitelisted: 'You are not whitelisted!',
  saleClosed: 'Sale is not open yet!',
  mintedMax: `You cannot mint more than ${mintConfig.maxPerWallet} NFTs`,
  mintingProgress: 'Minting in progress',
  mintingSuccess: 'Successfully minted',
};

export type SaleState = 'willStart' | 'presaleStarted' | 'presaleEnded' | 'publicStarted' | 'saleEnded';
