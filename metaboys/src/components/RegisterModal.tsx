import * as React from "react";
import logo from "../assets/img/LOGO.png"

import '../assets/css/header.css'
import { ethers } from "ethers";
import { config } from "../config";

import { useEffect } from "react";
import ImgPlus from "../assets/img/plus.png";
import ImgMinus from "../assets/img/minus.png";
import ImgEther from "../assets/img/Ethereum-Symbole.png";
import { IAssetData } from "../helpers/types";
import { whitelist } from "../whitelist";
import { connected } from "process";

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
  toast: Object;
}

interface IRegisterModalProps {
  connect: () => void;
  killSession: () => void;
  setNotifi: (value: Object) => void;
  state: IAppState;
}

const RegisterModal = (props: IRegisterModalProps) => {

  let { state, connect, killSession, setNotifi } = props;

  const [mintcnt, setMintCnt] = React.useState(1);

  const [loading, setLoading] = React.useState(false)

  const increase = () => {
    if (mintcnt < 5) {
      setMintCnt(mintcnt + 1);
    }
  }
  const decrease = () => {
    if (mintcnt > 1) {
      setMintCnt(mintcnt - 1);
    }
  }

  const errorHandle = (err: String) => {
    if (err.includes("SOLD OUT") === true) {
      setNotifi({ show: true, success: true, content: "Sold Out!" })
    } else
      if (err.includes("Insuficient funds") === true) {
        setNotifi({ show: true, success: true, content: "Insuficient funds!" })
      } else
        if (err.includes("You can only mint up to 5 token at once!") === true) {
          setNotifi({ show: true, success: true, content: "You can only  mint up to 5 token at once!" })
        } else
          if (err.includes(" You can't mint more than 5 tokens") === true) {
            setNotifi({ show: true, success: true, content: "You can't mint more than 5 tokens!" })
          } else
            if (err.includes("max supply exceeded!") === true) {
              setNotifi({ show: true, success: true, content: "Max Supply Exceeded!" })
            } else
              if (err.includes("Maximum 15 tokens per wallet") === true) {
                setNotifi({ show: true, success: true, content: "Maximum 15 tokens per wallet." })
              } else
                if (err.includes("You can only sale mint up to 5 token at once") === true) {
                  setNotifi({ show: true, success: true, content: "You can only sale mint up to 5 token at once!" })
                } else {
                  setNotifi({ show: true, success: true, content: err })
                }
  }
  const mint = async (cnt: number) => {
    const cprovider = new ethers.providers.Web3Provider(state.provider);
    const signer = cprovider.getSigner();
    const nftContract = new ethers.Contract(config.contract, config.abi, signer)

    let status = await nftContract.tokenStatus();

    //let address = state.address.toUpperCase();
    //console.log("address:"+address)
    let messageHash = whitelist[state.address.toUpperCase()];
    console.log("messageHash:" + messageHash)

    // if (status === 1 || messageHash) {
    if (status === 1) {
      if (!messageHash) {
        setNotifi({ show: true, success: true, content: "Your wallet address is not on the whitelist!" })
        //killSession()
        return
      }

      let tot = 1 * state.tokenprice * Math.pow(10, 18)
      let overrides = {
        value: tot.toString()
      }
      // let gas:any = await nftContract.estimateGas.vipMint( cnt, overrides ).then((res:any) => {
      let gas:any = await nftContract.estimateGas.vipMint(cnt, overrides ).then((res:any) => {
        // gas = res;
      }).catch((err: any) => {
        errorHandle(err.toString())
      });
      let estimateGas = gas*1000000000;
      if (estimateGas*2 > tot){
        setNotifi({show: true, success: true, content: "Gas fees are too high!"})
        return;
      } 
      await nftContract.vipMint(overrides).then((res: any) => {
        setNotifi({ show: true, success: true, content: "Successfully Minted!" })
      }).catch((err: any) => {
        errorHandle(err.toString())
      });
    } else
      if (status === 2) {
        let tot = cnt * state.tokenprice * Math.pow(10, 18)
        let overrides = {
          value: tot.toString()
        }
        let gas:any = await nftContract.estimateGas.presaleMint( cnt, overrides ).then((res:any) => {
          // gas = res;
        }).catch((err: any) => {
          errorHandle(err.toString())
        });;;
        let estimateGas = gas*1000000000;
        if (estimateGas*2 > tot){
          setNotifi({show: true, success: true, content: "Gas fees are too high."})
          return;
        }        
        await nftContract.presaleMint(cnt, overrides).then((res: any) => {
          setNotifi({ show: true, success: true, content: "Successfully Minted!" })
        }).catch((err: any) => {
          errorHandle(err.toString())
        });
      } else
      if (status === 3) {
        let tot = cnt * state.tokenprice * Math.pow(10, 18)
        let overrides = {
          value: tot.toString()
        }
        let gas:any = await nftContract.estimateGas.saleMint( cnt, overrides ).then((res:any) => {
          // gas = res;
        }).catch((err: any) => {
          errorHandle(err.toString())
        });;;
        let estimateGas = gas*1000000000;
        if (estimateGas*2 > tot){
          setNotifi({show: true, success: true, content: "Gas fees are too high."})
          return;
        }        
        await nftContract.saleMint(cnt, overrides).then((res: any) => {
          setNotifi({ show: true, success: true, content: "Successfully Minted!" })
        }).catch((err: any) => {
          errorHandle(err.toString())
        });
      }
  }
  const nftMint = () => {
    if (state.connected === false) {
      setNotifi({ show: true, success: true, content: "Please connect to wallet." })
      return;
    }
    mint(mintcnt)
  }
  return (
    <div className="b-black">
      <div className="back-btn-container">
        <a className='back-link' href='https://meta3oys.com' target='_blank' rel='noreferrer'>
          <div className='link-btn'>
            Back to META3OYS.com
          </div>
        </a>
      </div>
      <section className="top-header">
        <div className="container">
          {state.connected ? <span className="address">{state.address}</span> : ""}

          <div className="black-part-connect connect-wallet white-border">
            <img src="https://a.slack-edge.com/production-standard-emoji-assets/13.0/google-medium/1f449.png" alt="" width="22" height="22" />
            {state.connected ? <div className="disconnect-btn" onClick={killSession}>Disconnect Wallet</div> : <div className="connect-btn" onClick={connect}>&nbsp;&nbsp;Connect Wallet</div>}
          </div>
          <span>GET YOUR META3OYS</span><br />
          {/* {tokenprice>0?<span>unit price: {tokenprice} eth</span>:""} */}
          <div className="black-part row white-border">
            <div className="count col-6">
              <a onClick={decrease}><img src={ImgMinus} alt="icon" loading="lazy" /></a>
              <div>{mintcnt}</div>
              <a onClick={increase}><img src={ImgPlus} alt="icon" loading="lazy" /></a>
            </div>

            <div className="mint">
              <div className=" col-6">
                <a className="mint-btn" onClick={nftMint}>Mint</a>&nbsp;&nbsp;
                <img src="https://a.slack-edge.com/production-standard-emoji-assets/13.0/google-medium/1f448.png" alt="" />
              </div>
            </div>
          </div>
          {state.tokenprice > 0 ? <div className="token-price">1 META3OY = {(state.tokenprice * mintcnt).toFixed(2)} <img className="ether-img" src={ImgEther} /> + GAS </div> : ""}
          <span style={{ fontSize: "23px", color: "cyan" }}>MINT START IN</span><br /><span>{state.countdown}</span>
        </div>
      </section>
    </div>
  );
};

export default RegisterModal;