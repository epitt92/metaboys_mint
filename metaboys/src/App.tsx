import * as React from "react";
import styled from "styled-components";
import Web3 from "web3";
import { ethers } from "ethers";
import { convertUtf8ToHex } from "@walletconnect/utils";

// @ts-ignore
import Web3Modal from "web3modal";
// @ts-ignore
import WalletConnect from "@walletconnect/web3-provider";
// @ts-ignore
import Torus from "@toruslabs/torus-embed";
// @ts-ignore
import WalletLink from "walletlink";
import { Toast } from 'react-bootstrap'

import { config } from "./config";
import { whitelist } from "./whitelist";


import { apiGetAccountAssets } from "./helpers/api";
import {
  hashPersonalMessage,
  recoverPublicKey,
  recoverPersonalSignature,
  formatTestTransaction,
  getChainData
} from "./helpers/utilities";
import { IAssetData } from "./helpers/types";
import { fonts } from "./styles";
import {
  ETH_SEND_TRANSACTION,
  ETH_SIGN,
  PERSONAL_SIGN,
  DAI_BALANCE_OF,
  DAI_TRANSFER
} from "./constants";
import { callBalanceOf, callTransfer } from "./helpers/web3";
import RegisterModal from "./components/RegisterModal";
import { any } from "prop-types";

const SLayout = styled.div`
  position: relative;
  width: 100%;
  min-height: 100vh;
  text-align: center;
`;


interface IAppState {
  fetching: boolean;
  address: string;
  web3: any;
  provider: any;
  connected: boolean;
  chainId: number;
  networkId: number;
  assets: IAssetData[];
  showModal: boolean;
  showRegisterModal: boolean;
  pendingRequest: boolean;
  result: any | null;
  balance: number;
  tokenprice: number;
  countdown: string;
  toast: object;
}

const INITIAL_STATE: IAppState = {
  fetching: false,
  address: "",
  web3: null,
  provider: null,
  connected: false,
  chainId: 1,
  networkId: 1,
  assets: [],
  showModal: false,
  showRegisterModal: false,
  pendingRequest: false,
  balance: -1,
  result: null,
  tokenprice: 0,
  countdown: "",
  toast: localStorage.getItem("toast")!==null?JSON.parse((localStorage.getItem("toast") as string)):{
    show: false,
    success: false,
    content: ""
  }
};

function initWeb3(provider: any) {
  const web3: any = new Web3(provider);

  web3.eth.extend({
    methods: [
      {
        name: "chainId",
        call: "eth_chainId",
        outputFormatter: web3.utils.hexToNumber
      }
    ]
  });

  return web3;
}

class App extends React.Component<any, any> {
  // @ts-ignore
  public web3Modal: Web3Modal;
  public state: IAppState;

  constructor(props: any) {
    super(props);
    this.state = {
      ...INITIAL_STATE
    };

    this.web3Modal = new Web3Modal({
      network: this.getNetwork(),
      cacheProvider: true,
      providerOptions: this.getProviderOptions()
    });
  }

  public componentDidMount() {
    
    if (this.web3Modal.cachedProvider) {
      this.onConnect();
    }
    let app = this
    let x = setInterval(function() {
      // Get today's date and time
      let now = new Date().getTime();
        
      // Find the distance between now and the count down date
      let distance = config.countDownDate - now;
        
      // Time calculations for days, hours, minutes and seconds
      let days = Math.floor(distance / (1000 * 60 * 60 * 24));
      let hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      let minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      let seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      
      // test message
      let countdown = `${days} days ${hours} hrs ${minutes} min ${seconds} sec`;

      if (distance < 0) {
        clearInterval(x);
        let countdown = `started`;
      }

      app.setState((prev:any) => {
        return { ...prev, countdown };
      });
    }, 1000);
  }

  public onConnect = async () => {
    console.log('connect');
    const provider = await this.web3Modal.connect();

    await this.subscribeProvider(provider);

    await provider.enable();
    const web3: any = initWeb3(provider);
    const accounts = await web3.eth.getAccounts();

    const address = web3.currentProvider.selectedAddress;//accounts[0];

    const networkId = await web3.eth.net.getId();

    const chainId = await web3.eth.chainId();

    let balance = await web3.eth.getBalance(address);
    
    let price = 0
    await this.setState({
      web3,
      provider,
      connected: true,
      address,
      chainId,
      networkId,
      balance: balance,
      showRegisterModal: false,
      tokenprice: price
    });
    console.log(this.state)
    await this.getAccountAssets();

    const cprovider = new ethers.providers.Web3Provider(provider);
    const signer = cprovider.getSigner();
    console.log(signer)
    const nftContract = new ethers.Contract(config.contract, config.abi, signer)
    
    //console.log("address: "+address);
    let hash=whitelist[String(address).toUpperCase()];  
    //console.log("hash: "+hash);
    
    let status =  await nftContract.tokenStatus();
    if(status === 0){
      this.setNotification({show: true, success: true, content: "Contract paused!"})
      this.resetApp()
      return
    } else
    if(status === 1 || hash){
      price = await nftContract.getVipPrice()
    } else
    if(status === 2){
      price = await nftContract.getPrice()
    }
    price = parseFloat(ethers.utils.formatEther(price));
    await this.setState({
      web3,
      provider,
      connected: true,
      address,
      chainId,
      networkId,
      balance: balance,
      showRegisterModal: true,
      tokenprice: price
    });
  };

  public subscribeProvider = async (provider: any) => {
    if (!provider.on) {
      return;
    }
    provider.on("close", () => this.resetApp());
    provider.on("accountsChanged", async (accounts: string[]) => {
      await this.setState({ address: accounts[0] });
      await this.getAccountAssets();
    });
    provider.on("chainChanged", async (chainId: number) => {
      const { web3 } = this.state;
      const networkId = await web3.eth.net.getId();
      await this.setState({ chainId, networkId });
      console.log("network:", networkId)
      await this.getAccountAssets();
    });

    provider.on("networkChanged", async (networkId: number) => {
      const { web3 } = this.state;
      const chainId = await web3.eth.chainId();
      await this.setState({ chainId, networkId });
      await this.getAccountAssets();
      console.log("network:", networkId)
    });
  };

  public getNetwork = () => getChainData(this.state.chainId).network;

  public getProviderOptions = () => {
    // const infuraId = process.env.REACT_APP_INFURA_ID;
    const infuraId = "5986c4be3c3147beaae388867f0e0bea";
    console.log("infuraId", infuraId);
    const providerOptions = {
      walletconnect: {
        package: WalletConnect,
        options: {
          infuraId
        }
      },
      walletlink: {
        package: WalletLink,
        options: {
          appName: "Meta3oys",
          infuraId
        }
      }
    };
    return providerOptions;
  };
  public setNotification = (value:Object) =>{
    let toast = { ...this.state.toast, ...value };
    this.setState((prev:any) => {
      return { ...prev, toast };
    });
    localStorage.setItem("toast", JSON.stringify( this.state.toast))
  } 
  public getAccountAssets = async () => {
    const { address, chainId } = this.state;
    this.setState({ fetching: true });
    try {
      // get account balances
      const assets = await apiGetAccountAssets(address, chainId);

      await this.setState({ fetching: false, assets });
    } catch (error) {
      console.error(error); // tslint:disable-line
      await this.setState({ fetching: false });
    }
  };

  public toggleModal = () =>
    this.setState({ showModal: !this.state.showModal });

    /*
  public testSendTransaction = async () => {
    const { web3, address, chainId } = this.state;

    if (!web3) {
      return;
    }

    const tx = await formatTestTransaction(address, chainId);

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // @ts-ignore
      function sendTransaction(_tx: any) {
        return new Promise((resolve, reject) => {
          web3.eth
            .sendTransaction(_tx)
            .once("transactionHash", (txHash: string) => resolve(txHash))
            .catch((err: any) => reject(err));
        });
      }

      // send transaction
      const result = await sendTransaction(tx);

      // format displayed result
      const formattedResult = {
        action: ETH_SEND_TRANSACTION,
        txHash: result,
        from: address,
        to: address,
        value: "0 ETH"
      };

      // display result
      this.setState({
        web3,
        pendingRequest: false,
        result: formattedResult || null
      });
    } catch (error) {
      console.error(error); // tslint:disable-line
      this.setState({ web3, pendingRequest: false, result: null });
    }
  };

  public testSignMessage = async () => {
    const { web3, address } = this.state;

    if (!web3) {
      return;
    }

    // test message
    const message = "My email is john@doe.com - 1537836206101";

    // hash message
    const hash = hashPersonalMessage(message);

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send message
      const result = await web3.eth.sign(hash, address);

      // verify signature
      const signer = recoverPublicKey(result, hash);
      const verified = signer.toLowerCase() === address.toLowerCase();

      // format displayed result
      const formattedResult = {
        action: ETH_SIGN,
        address,
        signer,
        verified,
        result
      };

      // display result
      this.setState({
        web3,
        pendingRequest: false,
        result: formattedResult || null
      });
    } catch (error) {
      console.error(error); // tslint:disable-line
      this.setState({ web3, pendingRequest: false, result: null });
    }
  };

  public testSignPersonalMessage = async () => {
    const { web3, address } = this.state;

    if (!web3) {
      return;
    }

    // test message
    const message = "My email is fullstackdev1992@outlook.com";

    // encode message (hex)
    const hexMsg = convertUtf8ToHex(message);

    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send message
      const result = await web3.eth.personal.sign(hexMsg, address);

      // verify signature
      const signer = recoverPersonalSignature(result, message);
      const verified = signer.toLowerCase() === address.toLowerCase();

      // format displayed result
      const formattedResult = {
        action: PERSONAL_SIGN,
        address,
        signer,
        verified,
        result
      };

      // display result
      this.setState({
        web3,
        pendingRequest: false,
        result: formattedResult || null
      });
    } catch (error) {
      console.error(error); // tslint:disable-line
      this.setState({ web3, pendingRequest: false, result: null });
    }
  };

  public testContractCall = async (functionSig: string) => {
    let contractCall = null;
    switch (functionSig) {
      case DAI_BALANCE_OF:
        contractCall = callBalanceOf;
        break;
      case DAI_TRANSFER:
        contractCall = callTransfer;
        break;

      default:
        break;
    }

    if (!contractCall) {
      throw new Error(
        `No matching contract calls for functionSig=${functionSig}`
      );
    }

    const { web3, address, chainId } = this.state;
    try {
      // open modal
      this.toggleModal();

      // toggle pending request indicator
      this.setState({ pendingRequest: true });

      // send transaction
      const result = await contractCall(address, chainId, web3);

      // format displayed result
      const formattedResult = {
        action: functionSig,
        result
      };

      // display result
      this.setState({
        web3,
        pendingRequest: false,
        result: formattedResult || null
      });
    } catch (error) {
      console.error(error); // tslint:disable-line
      this.setState({ web3, pendingRequest: false, result: null });
    }
  };
  */

  public hideRegisterModal = async () => {
    this.setState({
      showRegisterModal: false
    })
  }

  public resetApp = async () => {
    const { web3 } = this.state;
    if (web3 && web3.currentProvider && web3.currentProvider.close) {
      await web3.currentProvider.close();
    }
    await this.web3Modal.clearCachedProvider();
    this.setState({ ...INITIAL_STATE });
    this.hideRegisterModal()
  };

  public render = () => {
    const {toast} = this.state
    return (
      <SLayout className="s-background">
        <RegisterModal state={this.state} connect={this.onConnect} killSession={this.resetApp} setNotifi={this.setNotification}/>
        <Toast show={(toast as any).show} className={(toast as any).success === true ? "success" : "error"} onClose={(e) => this.setNotification({show: false})}>
          <Toast.Header>
            <img
              src="holder.js/20x20?text=%20"
              className="rounded me-2"
              alt=""
            />
            <strong className="me-auto">{(toast as any).content}</strong>
          </Toast.Header>
        </Toast>
      </SLayout>
    );
  };
}
export default App;
