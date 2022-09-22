import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, retry, Subject } from 'rxjs';
import { AbiItem } from 'web3-utils';
import { provider } from 'web3-core';
import { WEB3 } from './web3';
import Web3Modal from 'web3modal';
import Web3 from 'web3';
import abi from '../../config/abi.json';
import WalletConnectProvider from '@walletconnect/web3-provider';

@Injectable({
  providedIn: 'root',
})
export class Web3Service {
  accountsObservable = new Subject<string[]>();
  web3Modal: Web3Modal;
  web3js: any;
  provider: provider | undefined;
  accounts: string[] | undefined;

  constructor(@Inject(WEB3) private web3: Web3, private http: HttpClient) {
    const providerOptions = {
      /*
      ! Uncomment this if you want to use a WalletConnect provider
      walletconnect: {
        package: WalletConnectProvider, // required
        options: {
          infuraId: 'env', // change this to your infura project id
          description: 'Scan the qr code and sign in',
          qrcodeModalOptions: {
            mobileLinks: ['rainbow', 'metamask', 'argent', 'trust', 'imtoken', 'pillar'],
          },
        },
      },
      */
      injected: {
        display: {
          logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
          name: 'MetaMask',
          description: 'Connect with the provider in your Browser',
        },
        package: null,
      },
    };

    this.web3Modal = new Web3Modal({
      network: 'mainnet', // change this to rinkeby for testing
      cacheProvider: true, // optional
      providerOptions, // required
      theme: {
        background: 'rgb(39, 49, 56)',
        main: 'rgb(199, 199, 199)',
        secondary: 'rgb(136, 136, 136)',
        border: 'rgba(195, 195, 195, 0.14)',
        hover: 'rgb(16, 26, 32)',
      },
    });
  }

  /**
   * Connect to the wallet
   * @returns {Promise<any>}
   */
  async connectAccount(): Promise<string[] | undefined> {
    this.provider = await this.web3Modal.connect();
    if (this.provider) {
      this.web3js = new Web3(this.provider);
    }
    this.accounts = await this.web3js.eth.getAccounts();
    return this.accounts;
  }

  /**
   * Load the contract
   * @param contract address of the contract
   * @returns {Promise<any>}
   */
  async loadContract(contract: string): Promise<any> {
    return new this.web3.eth.Contract(abi as AbiItem[], contract);
  }

  /**
   * Sign for presale validation
   * @param account address of the account
   * @param contract address of the contract
   * @returns signature
   */
  async signPresale(account: string, contract: string): Promise<any> {
    const message = this.web3.utils.soliditySha3(contract, account);
    if (message) {
      const sign = await this.web3.eth.accounts.sign(
        message,
        '603c13734233792745d50a6c9c0a55a075ad8b919d3c57d024e72a98a2d86353',
      );
      const r = sign['r'];
      const s = sign['s'];
      const v = sign['v'];
      return { r, s, v };
    }
    return null;
  }

  /**
   * Fetch the remote whitelist file
   * @param url url of the whitelist file
   * @returns the whitelist
   */
  getWhitelist(url: string): Observable<any> {
    return this.http
      .get<string[]>(`${url}?${Math.floor(Math.random() * 1000000) + 100000}`)
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Handle errors
   * @param error error message
   * @returns error message
   */
  handleError(error: any): any {
    let errorMessage = '';
    errorMessage = 'Something went wrong. Please try again later.';
    return alert(errorMessage);
  }
}
