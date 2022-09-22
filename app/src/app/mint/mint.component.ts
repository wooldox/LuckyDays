import { AfterViewInit, Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CountdownComponent, CountdownConfig } from 'ngx-countdown';
import { SaleState, mintConfig, msgStrs } from '../config/mint.config';
import { BehaviorSubject, interval } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Web3Service } from '../services/web3/web3.service';
import { WindowRef } from '../services/window/window-ref.service';
import { SubSink } from 'subsink';
import wl from '../config/wl.json';

@Component({
  selector: 'app-mint',
  templateUrl: './mint.component.html',
  styleUrls: ['./mint.component.scss'],
})
export class MintComponent implements OnInit, AfterViewInit {
  @Output() changeTab: EventEmitter<number> = new EventEmitter();
  @ViewChild('cd', { static: false }) private countdown!: CountdownComponent;

  public isMinting = new BehaviorSubject<boolean>(false);
  public isDisabled = new BehaviorSubject<boolean>(false);
  public quantityForm!: FormGroup;
  public countdownConfig: CountdownConfig = {};
  public mintingWallet: string = '';
  public totalMinted: number = 0;
  public singleCost: number = mintConfig.singleCost;
  public maxSupply: number = mintConfig.maxSupply;
  public maxPerWallet: number = mintConfig.maxPerWallet;
  public displayTimer: boolean = mintConfig.displayTimer;
  public presaleStarts: number = mintConfig.presaleStarts;
  public presaleEnds: number = mintConfig.presaleEnds;
  public publicStarts: number = mintConfig.publicStarts;
  public publicEnd: number = mintConfig.publicEnd;
  public currentState: SaleState = 'willStart';

  public get totalEth(): string {
    return (this.singleCost * this.quantityForm.get('quantity')?.value).toFixed(2);
  }

  private subscription = new SubSink();
  private whitelist: string[] | undefined;
  private msgStrs = msgStrs;

  /**
   * @description - handle tooltip message types
   * @param c - the message
   * @param d - the duration
   */
  private msg = {
    success: (c: string, d?: number) => (this.msgSrv.remove(), this.msgSrv.success(c, { nzDuration: d || 0 })),
    error: (c: string, d?: number) => (this.msgSrv.remove(), this.msgSrv.error(c, { nzDuration: d || 2500 })),
    loading: (c: string, d?: number) => (this.msgSrv.remove(), this.msgSrv.loading(c, { nzDuration: 0 })),
    destory: () => this.msgSrv.remove(),
  };

  constructor(
    private fb: FormBuilder,
    private winRef: WindowRef,
    private web3Srv: Web3Service,
    private msgSrv: NzMessageService,
  ) {}

  ngOnInit(): void {
    // Load the whitelist
    this.loadWhitelist();

    // Create the timer
    if (mintConfig.displayTimer) {
      this.currentState = this.assignTimerString();
      this.countdownConfig.stopTime = this.assignEndTime();
    }

    // Create the form
    this.quantityForm = this.fb.group({
      quantity: [1, [Validators.min(1), Validators.max(this.maxPerWallet)]],
    });

    // Monitor account changes
    window.ethereum.on('accountsChanged', (a: any) => {
      if (a.length && a[0].startsWith('0x')) this.mintingWallet = a[0];
      else (this.mintingWallet = ''), this.isDisabled.next(false);
    });
  }

  ngAfterViewInit(): void {
    if (this.countdown) this.countdown.begin();
  }

  /**
   * @param increment - increment or decrement the quantity
   */
  public toggleQuantitiy(increment?: boolean): void {
    const currentVal = this.quantityForm.get('quantity')?.value;
    if (!increment && currentVal > 1) {
      this.quantityForm.setValue({
        quantity: currentVal - 1,
      });
    }
    if (increment && currentVal < this.maxPerWallet) {
      this.quantityForm.setValue({
        quantity: currentVal + 1,
      });
    }
  }

  /**
   * @description - set the quantity to the max allowed
   */
  public setMax(): void {
    if (this.mintingWallet) {
      this.quantityForm.setValue({
        quantity: this.maxPerWallet,
      });
    }
  }

  /**
   * @description - connect wallet and load the contract
   */
  public connectWallet(): void {
    try {
      this.web3Srv.connectAccount().then(async (wallets: string[] | undefined) => {
        if (wallets?.length) this.mintingWallet = wallets[0];
        else this.msg.error(this.msgStrs.connectFailed);

        const netValid = await this.checkNetwork();
        if (!netValid) return;

        if (!this.winRef.native.contract) {
          this.winRef.native.contract = await this.web3Srv.loadContract(mintConfig.contract);
          await this.getTotalMinted();
          await this.checkSaleState();
        }
      });
    } catch (e) {
      this.msg.error('Something went wrong');
    }
    this.subscription.sink = interval(10000).subscribe(async () => await this.getTotalMinted());
    this.subscription.sink = interval(10000).subscribe(async () => await this.checkSaleState());
  }

  /**
   * Checks if the user is connected to the correct network
   * @param triggerMsg - should the message be triggered
   * @returns - true if the connected network is correct
   */
  public async checkNetwork(triggerMsg: boolean = true): Promise<boolean> {
    if (window.ethereum.networkVersion != mintConfig.network) {
      if (triggerMsg) this.msg.error(this.msgStrs.switchNet);
      return false;
    }
    return true;
  }

  /**
   * @description - check how many NFTs have been minted so far
   */
  public async getTotalMinted(): Promise<any> {
    const netValid = await this.checkNetwork(false);
    if (netValid) {
      const totalMinted = await this.winRef.native.contract.methods.totalSupply().call();
      this.totalMinted = totalMinted || this.totalMinted;
      if (totalMinted == this.maxSupply) this.currentState = 'saleEnded';
    }
  }

  /**
   * @description - initate the minting process
   * @returns - the current state of the sale
   */
  public async startMint(): Promise<any> {
    if (!this.mintingWallet) {
      return this.msg.error(this.msgStrs.connectWallet);
    }
    if (!this.winRef.native.contract) {
      this.winRef.native.contract = await this.web3Srv.loadContract(mintConfig.contract);
    }
    const netValid = await this.checkNetwork();
    if (!netValid) return;

    this.isMinting.next(true);
    try {
      const sale_state = await this.winRef.native.contract.methods.saleState().call();
      if (sale_state != 0) {
        const amount = this.quantityForm.get('quantity')?.value;
        const account = this.mintingWallet;
        if (!amount) return this.msg.error(this.msgStrs.invalidQuantity);
        if (!account) return this.msg.error(this.msgStrs.invalidWallet);
        if (sale_state == 1) {
          // If presale is in progress
          const isWhitelisted = this.checkWhitelist(account.toLocaleLowerCase());
          if (isWhitelisted && isWhitelisted !== 0) {
            this.mintPresale(amount, account).catch((e) => {
              this.isMinting.next(false);
              if (e.message.includes('insufficient funds')) {
                this.msg.error(this.msgStrs.notEnoughEth);
              } else {
                this.msg.error(e.message);
              }
            });
          } else {
            this.msg.error(this.msgStrs.notWhitelisted);
            this.isMinting.next(false);
          }
        } else {
          // if public sale is in progress
          this.mintPublic(amount, account).catch((e) => {
            this.msg.destory();
            this.isMinting.next(false);
            if (e.message.includes('insufficient funds')) {
              this.msg.error(this.msgStrs.notEnoughEth);
            } else {
              this.msg.error(e.message);
            }
          });
        }
      } else {
        this.msg.error(this.msgStrs.saleClosed);
        this.isMinting.next(false);
      }
    } catch (e) {
      this.msg.error('Something went wrong');
    }
  }

  /**
   * @description - mint the NFTs in presale
   * @param amount - the amount of NFTs to mint
   * @param account - the account to mint the NFTs to
   */
  public async mintPresale(amount: number, account: string): Promise<any> {
    const sign = await this.web3Srv.signPresale(account, mintConfig.contract);
    if (sign) {
      const { r, s, v } = sign;
      const mint_fee = await this.winRef.native.contract.methods.mintCost().call();
      const balance = await this.winRef.native.contract.methods.balanceOf(account).call();
      if (amount == 0) {
        this.msg.error(this.msgStrs.invalidQuantity);
        this.isMinting.next(false);
      } else if (parseInt(balance) + amount > this.maxPerWallet) {
        this.msg.error(this.msgStrs.mintedMax);
        this.isMinting.next(false);
      } else {
        this.msg.loading(this.msgStrs.mintingProgress);
        const gas_ = await this.winRef.native.contract.methods
          .presaleMint(amount, v, r, s)
          .estimateGas({ from: account, value: mint_fee * amount });
        const method = await this.winRef.native.contract.methods
          .presaleMint(amount, v, r, s)
          .send({ from: account, value: mint_fee * amount, gas: gas_ })
          .on('receipt', async (receipt: any) => this.triggerSuccess(receipt));
      }
    }
  }

  /**
   * @description - mint the NFTs in public sale
   * @param amount - the amount of NFTs to mint
   * @param account - the account to mint the NFTs to
   */
  public async mintPublic(amount: number, account: string): Promise<any> {
    if (!amount || !account) return null;
    const mint_fee = await this.winRef.native.contract.methods.mintCost().call();
    const balance = await this.winRef.native.contract.methods.balanceOf(account).call();
    if (amount == 0) {
      this.msg.error(this.msgStrs.invalidQuantity);
      this.isMinting.next(false);
    } else if (parseInt(balance) + amount > this.maxPerWallet) {
      this.msg.error(this.msgStrs.mintedMax);
      this.isMinting.next(false);
    } else {
      this.msg.loading(this.msgStrs.mintingProgress);
      const gas_ = await this.winRef.native.contract.methods
        .publicSaleMint(amount)
        .estimateGas({ from: account, value: mint_fee * amount });
      const method = await this.winRef.native.contract.methods
        .publicSaleMint(amount)
        .send({ from: account, value: mint_fee * amount, gas: gas_ })
        .on('receipt', async (receipt: any) => this.triggerSuccess(receipt));
    }
  }

  /**
   * @description - check the sale state
   * @returns - the current state of the sale
   */
  private async checkSaleState(): Promise<number> {
    const sale_state = await this.winRef.native.contract.methods.saleState().call();
    this.isDisabled.next(sale_state == 0);
    return sale_state;
  }

  /**
   * @description - assign the times for the counter
   * @returns - the current end time
   */
  private assignEndTime(): number {
    const state = this.currentState;
    if (state == 'willStart') return this.presaleStarts;
    if (state == 'presaleStarted') return this.presaleEnds;
    if (state == 'presaleEnded') return this.publicStarts;
    if (state == 'publicStarted') return this.publicEnd;
    else return 0;
  }

  /**
   * @description - assign the time ID based on the current time
   * @returns - the current time ID
   */
  private assignTimerString(): SaleState {
    const timeNow = Date.now();
    if (timeNow < this.presaleStarts) return 'willStart';
    if (timeNow >= this.presaleStarts && timeNow < this.presaleEnds) return 'presaleStarted';
    if (timeNow >= this.presaleEnds && timeNow < this.publicStarts) return 'presaleEnded';
    if (timeNow >= this.publicStarts && timeNow < this.publicEnd) return 'publicStarted';
    if (timeNow >= this.publicEnd) return 'saleEnded';
    return this.currentState;
  }

  /**
   * @description - trigger the success message on mint
   * @param receipt - the receipt of the transaction
   */
  private triggerSuccess(receipt: any): void {
    const successCount = receipt?.events?.Transfer?.length || '';
    let message = this.msgStrs.mintingSuccess;
    if (successCount) message += ` ${successCount} NFT`;
    if (successCount > 1) message += 's';
    this.msg.success(message, 10000);
    this.isMinting.next(false);
  }

  /**
   * @description - load the allowed presale accounts list
   */
  private loadWhitelist(): void {
    if (mintConfig.remoteList.length > 0) {
      this.subscription.sink = this.web3Srv.getWhitelist(mintConfig.remoteList).subscribe((l) => (this.whitelist = l));
    } else {
      this.whitelist = wl;
    }
  }

  /**
   * @description - check if an account is whitelisted
   * @param address - the address to check
   * @returns - an integer bigger than 0 if the address is whitelisted
   */
  private checkWhitelist(address: string) {
    return this.whitelist!.filter((li) => li.toLowerCase() == address).length;
  }
}
