import * as React from "react";
import * as ReactDOM from "react-dom";
import { createGlobalStyle } from "styled-components";
import './style.css'

import App from "./App";
import { globalStyle } from "./styles";
const GlobalStyle = createGlobalStyle`
  ${globalStyle}
`;

// @ts-ignore
declare global {
  // tslint:disable-next-line
  interface Window {
    web3: any;
    ethereum: any;
    Web3Modal: any;
    [name: string]: any;
  }
}
window.onload = function (e) {
  localStorage.clear();
}
window.onbeforeunload = (e) => {
  localStorage.clear();
}
if(localStorage.getItem("toast") === null){
  localStorage.setItem("toast", JSON.stringify({ show: false,  success: false,  content: "" }))
}



ReactDOM.render(
  <>
    <GlobalStyle />
    <App />
  </>,
  document.getElementById("root")
);
