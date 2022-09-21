import React from "react";
import { Dapp } from "./components/Dapp";
import { createRoot } from 'react-dom/client';
import "bootstrap/dist/css/bootstrap.css";

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Dapp />);