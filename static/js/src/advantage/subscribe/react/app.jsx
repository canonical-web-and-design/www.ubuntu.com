import React from "react";
import ReactDOM from "react-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PurchaseModal from "./PurchaseModal";

const stripePromise = loadStripe(window.stripePublishableKey);

const oneHour = 1000 * 60 * 60;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnmount: false,
      refetchOnReconnect: false,
      staleTime: oneHour,
      retryOnMount: false,
    },
  },
});

/*
 *
 * This app is using react query (https://react-query.tanstack.com/overview) to manage data from the API
 * This library has built in devtools which are really helpful.
 * To enable them you need to replace "production" by "development" in "/build.js"
 * If you do so, please make sure to revert the change before you merge your changes.
 *
 */

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Elements stripe={stripePromise}>
        <PurchaseModal />
      </Elements>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

ReactDOM.render(<App />, document.getElementById("react-root"));
