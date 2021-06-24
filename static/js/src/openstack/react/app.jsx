import ReactDOM from "react-dom";
import React from "react";

import CostCalculatorForm from "./components/CostCalculatorForm";

function App() {
  return <CostCalculatorForm />;
}

ReactDOM.render(<App />, document.getElementById("cost-calculator-section"));
