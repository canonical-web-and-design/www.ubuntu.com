import { debounce } from "./utils/debounce.js";

import {
  ensurePurchaseAccount,
  getPurchase,
  getRenewal,
  getCustomerInfo,
  postInvoiceID,
  postCustomerInfoToStripeAccount,
  postCustomerInfoForPurchasePreview,
  postRenewalIDToProcessPayment,
  postPurchaseData,
  postPurchasePreviewData,
} from "./advantage/contracts-api.js";

import { parseForErrorObject } from "./advantage/error-handler.js";
import { vatCountries } from "./advantage/countries-and-states.js";

import {
  setOrderInformation,
  setOrderTotals,
  setPaymentInformation,
  setRenewalInformation,
} from "./advantage/set-modal-info.js";
import { checkoutEvent, purchaseEvent } from "./advantage/ecom-events.js";
import { getSessionData } from "./utils/getSessionData.js";

const modal = document.getElementById("ua-payment-modal");

const form = document.getElementById("details-form");
const errorDialog = document.getElementById("payment-error-dialog");
const progressIndicator = document.getElementById("js-progress-indicator");

const countryDropdown = modal.querySelector("select");
const termsCheckbox = modal.querySelector(".js-terms");
const vatInput = modal.querySelector('input[name="tax"]');
const addPaymentMethodButton = modal.querySelector(".js-payment-method");
const processPaymentButton = modal.querySelector(".js-process-payment");
const provincesContainer = modal.querySelector(".js-provinces-container");
const statesContainer = modal.querySelector(".js-states-container");
const vatContainer = modal.querySelector(".js-vat-container");
const vatErrorElement = vatContainer.querySelector(
  ".p-form-validation__message"
);
const changePaymentMethodButton = modal.querySelector(
  ".js-change-payment-method"
);
const cancelModalButton = modal.querySelector(".js-cancel-modal");
const closeModalButton = modal.querySelector(".js-close-modal");

const cardErrorElement = document.getElementById("card-errors");
const paymentErrorElement = document.getElementById("payment-errors");

const forMyselfRadio = document.getElementById("buying_for_myself");

const forOrganisationRadio = document.getElementById(
  "buying_for_an_organisation"
);
const accountNameField = document.getElementById("account_name");
const accountNameLabel = document.getElementById("account_name_label");

// initialise Stripe
const stripe = window.Stripe(window.stripePublishableKey);

// customise the Stripe card field
const style = {
  base: {
    iconColor: "#e95420",
    color: "#111",
    fontWeight: 300,
    fontFamily:
      '"Ubuntu", -apple-system, "Segoe UI", "Roboto", "Oxygen", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    fontSmoothing: "antialiased",
    fontSize: "16px",
    "::placeholder": {
      color: "#666",
    },
    ":-webkit-autofill": {
      color: "#666",
    },
  },
};

// create the Stripe card input, and apply the style to it
const elements = stripe.elements({
  fonts: [
    {
      family: "Ubuntu",
    },
  ],
});

const card = elements.create("card", { style });

const currentTransaction = {
  accountId: null,
  transactionId: null,
  contractId: null,
  products: [],
  type: null,
};

let customerInfo = {
  email: null,
  name: null,
  accountName: null,
  address: null,
  tax: null,
};

let cardValid = false;
let changingPaymentMethod = false;
let guestPurchase = false;
let submitted3DS = false;
let vatApplicable = false;

let pollingTimer;
let progressTimer;
let progressTimer2;
let progressTimer3;
let progressTimer4;

let isCustomerInfoSet = false;
let isCustomerInfoSetFailed = false;

function attachCTAevents() {
  document.addEventListener("click", (e) => {
    const isRenewalCTA = e.target.classList.contains("js-ua-renewal-cta");
    const isShopCTA = e.target.classList.contains("js-ua-shop-cta");

    const data = e.target.dataset;

    if (isRenewalCTA || isShopCTA) {
      e.preventDefault();

      if (!currentTransaction.accountId) {
        currentTransaction.accountId = data.accountId;
      }
    }

    if (
      currentTransaction.accountId &&
      !isCustomerInfoSet &&
      !isCustomerInfoSetFailed &&
      !guestPurchase
    ) {
      fetchCustomerInfo(currentTransaction.accountId);
    }

    if (isRenewalCTA) {
      currentTransaction.type = "renewal";
      currentTransaction.contractId = data.contractId;
      currentTransaction.transactionId = data.renewalId;
      currentTransaction.total = data.total;

      setRenewalInformation(data, modal);
      applyRenewalTotals();
    } else if (isShopCTA) {
      const cartItems = JSON.parse(data.cart);

      modal.classList.add("is-processing");
      currentTransaction.type = "purchase";

      // make sure the product array is empty
      // before we start adding to it
      currentTransaction.products = [];

      // for guest checkout, we'll show the annual
      // subtotal until they've added a payment method
      // and VAT can be shown
      currentTransaction.subtotal = data.subtotal;

      currentTransaction.previousPurchaseId = data.previousPurchaseId;
      cartItems.forEach((item) => {
        currentTransaction.products.push({
          name: item.product.name,
          price: item.product.price.value,
          product_listing_id: item.listingID,
          quantity: parseInt(item.quantity),
          period: item.product.period,
        });
      });

      checkoutEvent(analyticsFriendlyProducts(), 1);
      setOrderInformation(cartItems, modal);
      checkVATdebounce();
    }

    if (isRenewalCTA || isShopCTA) {
      handleCountryInput();
      toggleModal();
      card.focus();
      sendGAEvent("opened payment modal");
    }
  });
}

function attachCustomerInfoToStripeAccount(paymentMethod) {
  let stripeTaxObject = null;

  if (customerInfo.tax) {
    stripeTaxObject = {
      value: customerInfo.tax,
      type: "eu_vat",
    };
  }

  postCustomerInfoToStripeAccount({
    paymentMethodID: paymentMethod.id,
    accountID: currentTransaction.accountId,
    address: customerInfo.address,
    name: customerInfo.name,
    taxID: stripeTaxObject,
  })
    .then((data) => {
      applyLoggedInPurchaseTotals();
      handleCustomerInfoResponse(paymentMethod, data);
    })
    .catch((data) => {
      const errorObject = parseForErrorObject(data);
      presentError(errorObject);
    });
}

function attachFormEvents() {
  for (let i = 0; i < form.elements.length; i++) {
    const input = form.elements[i];

    input.addEventListener("input", (e) => {
      if (guestPurchase && input.type === "email") {
        guestPurchase = false;
        currentTransaction.accountId = "";
      }

      validateFormInput(e.target, false);
    });

    input.addEventListener("blur", (e) => {
      if (input.name !== "tax") {
        validateFormInput(e.target, true);
      }
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!addPaymentMethodButton.disabled) {
      addPaymentMethodButton.click();
    }
  });

  vatInput.addEventListener("input", () => {
    checkVATdebounce();
  });

  countryDropdown.addEventListener("change", () => {
    handleCountryInput();
    checkVATdebounce();
  });

  // these elements aren't rendered on the renewal form
  // or if an account isn't present, so check for their
  // existence first
  if (forMyselfRadio && forOrganisationRadio) {
    forMyselfRadio.addEventListener("change", handleNameFieldRadio);
    forOrganisationRadio.addEventListener("change", handleNameFieldRadio);
  }

  termsCheckbox.addEventListener("change", () => {
    if (termsCheckbox.checked) {
      processPaymentButton.disabled = false;
    } else {
      processPaymentButton.disabled = true;
    }
  });
}

function handleNameFieldRadio() {
  if (forMyselfRadio) {
    if (forMyselfRadio.checked) {
      accountNameField.value = "";
      accountNameField.disabled = true;
      accountNameLabel.classList.add("u-text--muted");
    } else {
      accountNameField.disabled = false;
      accountNameLabel.classList.remove("u-text--muted");
    }
  }
}

function attachModalButtonEvents() {
  addPaymentMethodButton.addEventListener("click", (e) => {
    e.preventDefault();

    changingPaymentMethod = false;
    sendGAEvent("submitted payment details");
    createPaymentMethod();
  });

  processPaymentButton.addEventListener("click", (e) => {
    e.preventDefault();

    sendGAEvent("clicked 'Pay'");
    processStripePayment();
  });

  changePaymentMethodButton.addEventListener("click", (e) => {
    e.preventDefault();
    changingPaymentMethod = true;
    card.clear();
    showDetailsMode();
  });

  cancelModalButton.addEventListener("click", (e) => {
    e.preventDefault();

    if (changingPaymentMethod) {
      setFormElements();
      showPayMode();
    } else {
      closeModal("clicked cancel");
    }
  });

  closeModalButton.addEventListener("click", (e) => {
    e.preventDefault();
    closeModal("clicked close");
  });

  document.addEventListener("keyup", (e) => {
    if (
      e.key === "Escape" &&
      document.body.classList.contains("p-modal--active")
    ) {
      closeModal("pressed escape key");
    }
  });
}

function checkVAT() {
  vatContainer.classList.remove("is-error");

  if (vatCountries.includes(countryDropdown.value)) {
    vatApplicable = true;
    vatContainer.classList.remove("u-hide");
  } else {
    vatApplicable = false;
    vatContainer.classList.add("u-hide");
    vatInput.value = "";
  }

  applyTotals();
}

const checkVATdebounce = debounce(checkVAT, 500);

function applyTotals() {
  // Clear any existing totals
  setOrderTotals(null, vatApplicable, null, modal);

  if (currentTransaction.type == "renewal") {
    applyRenewalTotals();
  } else if (
    currentTransaction.accountId &&
    currentTransaction.type == "purchase"
  ) {
    applyLoggedInPurchaseTotals();
  } else {
    applyGuestPurchaseTotals();
  }
}

function applyLoggedInPurchaseTotals() {
  setCustomerInfo();

  if (currentTransaction.type == "purchase") {
    const formData = new FormData(form);
    const country = formData.get("Country");
    const taxObject = formData.get("tax")
      ? {
          value: formData.get("tax"),
          type: "eu_vat",
        }
      : null;

    const address = customerInfo.address
      ? customerInfo.address
      : { country: country };

    postCustomerInfoForPurchasePreview(
      currentTransaction.accountId,
      customerInfo.name,
      address,
      taxObject
    )
      .then((data) => {
        if (data.code) {
          // an error was returned, most likely
          // regarding an invalid VAT number.
          // We don't need it to block posting the
          // preview data
          const errorObject = parseForErrorObject(data);
          presentError(errorObject);
        } else {
          validateFormInput(form.tax, true);
        }

        postPurchasePreviewData(
          currentTransaction.accountId,
          currentTransaction.products,
          currentTransaction.previousPurchaseId
        )
          .then((purchasePreview) => {
            currentTransaction.total = purchasePreview.total;
            currentTransaction.tax = purchasePreview.taxAmount;
            modal.classList.remove("is-processing");
            if (purchasePreview.errors) {
              setOrderTotals(
                null,
                false,
                {
                  total: currentTransaction.subtotal,
                },
                modal
              );
            } else {
              setOrderTotals(country, vatApplicable, purchasePreview, modal);
            }
          })
          .catch((error) => {
            modal.classList.remove("is-processing");
            setOrderTotals(
              null,
              false,
              {
                total: currentTransaction.subtotal,
              },
              modal
            );
            console.error(error);
          });
      })
      .catch((error) => {
        modal.classList.remove("is-processing");
        console.error(error);
      });
  }
}

function applyGuestPurchaseTotals() {
  const purchaseTotals = {
    total: currentTransaction.subtotal,
  };
  guestPurchase = true;
  modal.classList.remove("is-processing");

  // set the "Country" and vatApplicable parameters
  // to null. Since we don't have an account ID,
  // we can't yet make a simulated purchase to
  // get back a VAT amount
  setOrderTotals(null, false, purchaseTotals, modal);
}

function applyRenewalTotals() {
  const renewalTotals = {
    total: currentTransaction.total,
  };

  // the API doesn't allow simulated purchases
  // on renewals of older contracts (predating the shop),
  // so we can't show VAT information.
  setOrderTotals(null, false, renewalTotals, modal);
}

function fetchCustomerInfo(accountId) {
  getCustomerInfo(accountId)
    .then((res) => {
      const name = res.data.accountInfo.name;
      const address = res.data.customerInfo.address;
      customerInfo = { ...res.customerInfo, name, address };
      setFormElements();
      isCustomerInfoSet = true;
      isCustomerInfoSetFailed = false;
    })
    .catch((e) => {
      isCustomerInfoSetFailed = true;
      console.error(e);
    });
}

function setFormElements() {
  const { email, name, accountName, address, tax } = customerInfo;

  if (email) form.elements["email"].value = email;

  if (name) form.elements["name"].value = name;

  if (accountName) form.elements["account_name"].value = accountName;

  if (tax) form.elements["tax"].value = tax;

  if (address) {
    form.elements["Country"].value = address.country;
    handleCountryInput();
    form.elements["address"].value = address.line1;
    form.elements["city"].value = address.city;
    form.elements["postal_code"].value = address.postal_code;
    if (address.country === "US") {
      form.elements["us_state"].value = address.state;
    } else if (address.country === "CA") {
      form.elements["ca_province"].value = address.state;
    }
  }
}

function clearProgressTimers() {
  clearTimeout(progressTimer);
  clearTimeout(progressTimer2);
  clearTimeout(progressTimer3);
  clearTimeout(progressTimer4);
}

function closeModal(label) {
  sendGAEvent(`exited payment modal (${label})`);
  resetModal();
  toggleModal();
}

function createPaymentMethod() {
  enableProcessingState("payment_method");
  setCustomerInfo();

  stripe
    .createPaymentMethod({
      type: "card",
      card: card,
      billing_details: {
        name: customerInfo.name,
        email: customerInfo.email,
      },
    })
    .then((result) => {
      handlePaymentMethodResponse(result);
    })
    .catch((error) => {
      console.error(error);
      disableProcessingState();
      presentError();
    });
}

function disableProcessingState() {
  const formInputs = form.querySelectorAll("input");
  const formSelects = form.querySelectorAll("select");
  const cardInput = document.getElementById("card-element");

  clearProgressTimers();
  resetProgressIndicator();

  formInputs.forEach((input) => (input.readonly = false));
  formSelects.forEach((select) => (select.readonly = false));
  cancelModalButton.disabled = false;
  cardInput.classList.remove("u-disabled");

  handleNameFieldRadio();
}

function enableProcessingState(mode) {
  const formInputs = form.querySelectorAll("input");
  const formSelects = form.querySelectorAll("select");
  const cardField = document.getElementById("card-element");

  addPaymentMethodButton.disabled = true;
  cancelModalButton.disabled = true;
  processPaymentButton.disabled = true;

  formInputs.forEach((input) => (input.readonly = true));
  formSelects.forEach((select) => (select.readonly = true));
  cardField.classList.add("u-disabled");

  // show a progress indicator that evolves over time
  progressTimer = setTimeout(() => {
    progressIndicator.classList.remove("u-hide");

    progressTimer2 = setTimeout(() => {
      if (mode === "payment") {
        progressIndicator.querySelector("span").innerHTML = "Making payment...";
      } else if (mode === "payment_method") {
        progressIndicator.querySelector("span").innerHTML =
          "Checking details...";
      }

      progressTimer3 = setTimeout(() => {
        progressIndicator.querySelector("span").innerHTML = "Still trying...";

        progressTimer4 = setTimeout(() => {
          // the payment is taking time to process, reload the page
          // and highlight the in-progress renewal
          if (mode === "payment") {
            sendGAEvent("page reload: payment processing > 60s");
            reloadPage();
          }

          // there is potentially a problem with one of the APIs preventing
          // payment methods from being created
          if (mode === "payment_method") {
            presentError({
              message:
                "Sorry, your payment method can’t be set up at the moment. Try again in a few minutes.",
              type: "dialog",
            });
          }
        }, 45000);
      }, 11000);
    }, 2000);
  }, 2000);
}

function analyticsFriendlyProducts() {
  let products = [];

  currentTransaction.products.forEach((product) => {
    products.push({
      id: product.product_listing_id,
      name: product.name,
      price: product.price / 100,
      quantity: product.quantity,
    });
  });

  return products;
}

function handleCountryInput() {
  const stateSelect = statesContainer.querySelector("select");
  const provinceSelect = provincesContainer.querySelector("select");

  if (countryDropdown.value === "US") {
    statesContainer.classList.remove("u-hide");
    stateSelect.required = true;
    provincesContainer.classList.add("u-hide");
    provinceSelect.required = false;
    provinceSelect.value = "";
  } else if (countryDropdown.value === "CA") {
    statesContainer.classList.add("u-hide");
    stateSelect.required = false;
    stateSelect.value = "";
    provincesContainer.classList.remove("u-hide");
    provinceSelect.required = true;
  } else {
    statesContainer.classList.add("u-hide");
    stateSelect.required = false;
    stateSelect.value = "";
    provincesContainer.classList.add("u-hide");
    provinceSelect.required = false;
    provinceSelect.value = "";
  }
}

function handleIncompletePayment(invoice) {
  if (invoice.pi_status === "requires_payment_method") {
    // the user's original payment method failed,
    // capture a new payment method, then post the
    // renewal invoice number to trigger another
    // payment attempt

    let type = "renewals";
    let transactionId = currentTransaction.transactionId;
    let invoiceID = invoice.invoice_id;

    if (currentTransaction.type === "purchase") {
      type = "purchase";
      invoiceID = invoice.id;
    }

    postInvoiceID(type, transactionId, invoiceID)
      .then((data) => {
        handlePaymentAttemptResponse(data);
      })
      .catch((error) => {
        console.error(error);
        pollTransactionStatus();
      });
  } else if (requiresAuthentication(invoice)) {
    // 3DS has been requested by Stripe
    clearTimeout(pollingTimer);
    resetProgressIndicator();

    stripe.confirmCardPayment(invoice.pi_secret).then(function (result) {
      handle3DSresponse(result);
    });
  } else {
    presentError();
  }
}

function handleIncompletePurchase(purchase) {
  let invoice;
  let paymentIntentStatus;
  let subscriptionStatus;

  if (purchase.stripeInvoices && purchase.stripeInvoices.length > 0) {
    invoice = purchase.stripeInvoices[0];
    paymentIntentStatus = invoice.pi_status;
    subscriptionStatus = invoice.subscription_status;
  }

  let processing = !subscriptionStatus || !paymentIntentStatus || submitted3DS;

  if (processing) {
    clearTimeout(pollingTimer);

    pollingTimer = setTimeout(() => {
      pollTransactionStatus();
    }, 3000);
  } else {
    handleIncompletePayment(invoice);
  }
}

function handleIncompleteRenewal(renewal) {
  let invoice;
  let paymentIntentStatus;
  let subscriptionStatus;

  if (renewal.stripeInvoices && renewal.stripeInvoices.length > 0) {
    invoice = renewal.stripeInvoices[0];
    paymentIntentStatus = invoice.pi_status;
    subscriptionStatus = invoice.subscription_status;
  }

  let processing =
    !subscriptionStatus ||
    !paymentIntentStatus ||
    subscriptionStatus === "active" ||
    submitted3DS;

  if (processing) {
    clearTimeout(pollingTimer);

    pollingTimer = setTimeout(() => {
      pollTransactionStatus();
    }, 3000);
  } else if (subscriptionStatus !== "active") {
    handleIncompletePayment(invoice);
  }
}

function handlePaymentMethodResponse(data) {
  if (!data.paymentMethod) {
    const errorObject = parseForErrorObject(data.error);
    presentError(errorObject);
    return;
  }

  if (currentTransaction.accountId) {
    attachCustomerInfoToStripeAccount(data.paymentMethod);
    return;
  }

  handleGuestPaymentMethodResponse(data);
}

function handleGuestPaymentMethodResponse(data) {
  // the user is a guest, get them a guest account to make
  // purchases with and then continue
  const paymentMethod = data.paymentMethod;

  ensurePurchaseAccount({
    email: customerInfo.email,
    accountName: customerInfo.accountName,
    paymentMethodID: paymentMethod.id,
    country: customerInfo.address.country,
  }).then((data) => {
    if (data.code) {
      // an error was returned, most likely cause
      // is that the user is trying to make a purchase
      // with an email address belonging to an
      // existing SSO account
      const errorObject = parseForErrorObject(data);
      presentError(errorObject);
    } else {
      currentTransaction.accountId = data.accountID;
      attachCustomerInfoToStripeAccount(paymentMethod);
    }
  });
}

function handle3DSresponse(data) {
  submitted3DS = true;

  if (data.error) {
    presentError({
      message: data.error.message,
      type: "notification",
    });
    submitted3DS = false;
  } else {
    enableProcessingState("payment");
    pollTransactionStatus();
  }
}

function handleCustomerInfoResponse(paymentMethod, data) {
  if (data.message) {
    // ua-contracts returned an error with information for us to parse
    const errorObject = parseForErrorObject(data);
    presentError(errorObject);
  } else if (data.createdAt) {
    // payment method was successfully attached,
    // ask user to click "Pay"

    if (currentTransaction.type == "purchase") {
      checkoutEvent(analyticsFriendlyProducts(), 2);
    }

    setPaymentInformation(paymentMethod, modal);
    showPayMode();
  } else {
    // an unexpected error occurred
    presentError();
  }
}

function handlePaymentAttemptResponse(data) {
  if (data.code) {
    const errorObject = parseForErrorObject(data);

    if (errorObject) {
      sendGAEvent("payment failed");
      presentError(errorObject);
    } else {
      pollTransactionStatus();
    }
  } else {
    pollTransactionStatus();
  }
}

function handleSuccessfulPayment(transaction) {
  sendGAEvent("payment succeeded");

  if (currentTransaction.type == "purchase") {
    const purchaseInfo = {
      id: transaction.id,
      origin: "UA Shop",
      total: currentTransaction.total / 100,
      tax: currentTransaction.tax / 100,
    };

    const products = analyticsFriendlyProducts();

    purchaseEvent(purchaseInfo, products);

    // Remove the product selection from the local storage
    localStorage.removeItem("ua-subscribe-state");
  }

  disableProcessingState();
  progressIndicator.querySelector(".p-icon--spinner").classList.add("u-hide");
  progressIndicator
    .querySelector(".p-icon--success")
    .classList.remove("u-hide");
  progressIndicator.querySelector("span").innerHTML =
    "Payment complete. One moment...";
  progressIndicator.classList.remove("u-hide");

  submitMarketoForm();
}

function hideErrors() {
  cardErrorElement.innerHTML = "";
  cardErrorElement.classList.add("u-hide");
  paymentErrorElement.querySelector(".p-notification__message").innerHTML = "";
  paymentErrorElement.classList.add("u-hide");
}

function pollTransactionStatus() {
  let getCall = getRenewal;
  let incompleteHandler = handleIncompleteRenewal;

  if (currentTransaction.type === "purchase") {
    getCall = getPurchase;
    incompleteHandler = handleIncompletePurchase;
  }

  if (currentTransaction.transactionId) {
    getCall(currentTransaction.transactionId)
      .then((transaction) => {
        if (transaction.status !== "done") {
          incompleteHandler(transaction);
        } else {
          handleSuccessfulPayment(transaction);
        }
      })
      .catch((error) => {
        console.error(error);
        presentError();
      });
  } else {
    console.error("missing transaction ID");
    presentError();
  }
}

function presentError(errorObject) {
  if (!errorObject) {
    errorObject = {
      message:
        "Sorry, there was an unknown error with the payment. Check the details and try again. Contact <a href='https://ubuntu.com/contact-us'>Canonical sales</a> if the problem persists.",
      type: "notification",
    };
  }

  if (errorObject.type === "card") {
    cardErrorElement.innerHTML = errorObject.message;
    cardErrorElement.classList.remove("u-hide");
    showDetailsMode();
  } else if (errorObject.type === "notification") {
    paymentErrorElement.querySelector(".p-notification__message").innerHTML =
      errorObject.message;
    paymentErrorElement.classList.remove("u-hide");
    showDetailsMode();
  } else if (errorObject.type === "dialog") {
    errorDialog.innerHTML = errorObject.message;
    showDialogMode();
  } else if (errorObject.type === "vat") {
    vatContainer.classList.add("is-error");
    vatErrorElement.innerHTML = errorObject.message;
    vatErrorElement.classList.remove("u-hide");
    vatInput.focus();
    disableProcessingState();
  } else {
    console.error(`invalid argument: ${JSON.stringify(errorObject)}`);
  }
}

function processStripePayment() {
  enableProcessingState("payment");

  if (currentTransaction.type === "renewal") {
    postRenewalIDToProcessPayment(currentTransaction.transactionId)
      .then((data) => {
        handlePaymentAttemptResponse(data);
      })
      .catch((error) => {
        console.error(error);
        sendGAEvent("payment failed");
        presentError();
      });
  } else if (currentTransaction.type === "purchase") {
    checkoutEvent(analyticsFriendlyProducts(), 3);

    postPurchaseData(
      currentTransaction.accountId,
      currentTransaction.products,
      currentTransaction.previousPurchaseId
    )
      .then((data) => {
        if (data.id) {
          currentTransaction.transactionId = data.id;
        }
        handlePaymentAttemptResponse(data);
      })
      .catch((error) => {
        console.error(error);
        sendGAEvent("payment failed");
        presentError();
      });
  }
}

function reloadPage() {
  if (currentTransaction.type === "renewal") {
    location.search = `?subscription=${currentTransaction.contractId}`;
  } else if (currentTransaction.type === "purchase" && !guestPurchase) {
    location.pathname = "/advantage";
  } else if (currentTransaction.type === "purchase" && guestPurchase) {
    location.href = `/advantage/subscribe/thank-you?email=${encodeURIComponent(
      customerInfo.email
    )}`;
  }
}

function requiresAuthentication(invoice) {
  if (invoice.pi_decline_code) {
    if (invoice.pi_decline_code === "authentication_required") {
      return true;
    }
  }

  if (invoice.pi_status === "requires_action" && invoice.pi_secret) {
    return true;
  }

  return false;
}

function resetModal() {
  card.clear();
  showDetailsMode();
}

function resetProgressIndicator() {
  progressIndicator
    .querySelector(".p-icon--spinner")
    .classList.remove("u-hide");
  progressIndicator.querySelector(".p-icon--success").classList.add("u-hide");
  progressIndicator.querySelector("span").innerHTML = "";
  progressIndicator.classList.add("u-hide");
}

function sendGAEvent(label) {
  if (window.stripePublishableKey.includes("pk_live_")) {
    dataLayer.push({
      event: "GAEvent",
      eventCategory: "advantage",
      eventAction: currentTransaction.type,
      eventLabel: label,
      eventValue: undefined,
    });
  }
}

function setCustomerInfo() {
  let formData = new FormData(form);

  customerInfo = {
    email: formData.get("email"),
    name: formData.get("name"),
    accountName:
      (formData.get("account_name") && formData.get("account_name").trim()) ||
      formData.get("name"),
    address: {
      city: formData.get("city"),
      country: formData.get("Country"),
      line1: formData.get("address"),
      postal_code: formData.get("postal_code"),
      state:
        formData.get("Country") === "US"
          ? formData.get("us_state")
          : formData.get("ca_province"),
    },
    tax: formData.get("tax"),
  };
}

function setupCardElements() {
  card.mount("#card-element");

  card.on("change", (event) => {
    if (event.error) {
      const errorObject = parseForErrorObject(event.error);
      cardValid = false;
      addPaymentMethodButton.disabled = true;
      presentError(errorObject);
    } else if (event.complete) {
      cardValid = true;
      hideErrors();
      validateForm();
    } else {
      hideErrors();
    }
  });
}

function showDetailsMode() {
  disableProcessingState();
  modal.classList.remove("is-pay-mode", "is-dialog-mode");
  modal.classList.add("is-details-mode");
  addPaymentMethodButton.disabled = true;
  processPaymentButton.disabled = true;
  termsCheckbox.checked = false;
  card.focus();
  validateForm();
}

function showDialogMode() {
  disableProcessingState();
  modal.classList.remove("is-pay-mode", "is-details-mode");
  modal.classList.add("is-dialog-mode");
  addPaymentMethodButton.disabled = true;
  processPaymentButton.disabled = true;
  termsCheckbox.checked = false;
}

function showPayMode() {
  hideErrors();
  disableProcessingState();
  modal.classList.remove("is-details-mode", "is-dialog-mode");
  modal.classList.add("is-pay-mode");
  addPaymentMethodButton.disabled = true;
  processPaymentButton.disabled = true;
  termsCheckbox.checked = false;
}

function submitMarketoForm() {
  let request = new XMLHttpRequest();
  let formData = new FormData();
  formData.append("munchkinId", "066-EOV-335");
  formData.append("formid", 3756);
  formData.append("formVid", 3756);
  formData.append("Email", customerInfo.email);
  formData.append("Consent_to_Processing__c", "yes");
  formData.append("GCLID__c", getSessionData("gclid"));
  formData.append("utm_campaign", getSessionData("utm_campaign"));
  formData.append("utm_source", getSessionData("utm_source"));
  formData.append("utm_medium", getSessionData("utm_medium"));

  request.open(
    "POST",
    "https://app-sjg.marketo.com/index.php/leadCapture/save2"
  );
  request.send(formData);

  request.onreadystatechange = () => {
    if (request.readyState === 4) {
      reloadPage();
    }
  };
}

function toggleModal() {
  if (modal && modal.classList.contains("p-modal")) {
    modal.classList.toggle("u-hide");
    document.documentElement.classList.toggle("p-modal--active");
  }
}

function validateForm() {
  const inputs = form.elements;
  let inputsValidity = [cardValid];

  for (let i = 0; i < inputs.length; i++) {
    const isValid = inputs[i].checkValidity();
    inputsValidity.push(isValid);
  }

  if (inputsValidity.includes(false)) {
    addPaymentMethodButton.disabled = true;
  } else {
    addPaymentMethodButton.disabled = false;
  }
}

function validateFormInput(input, highlightError) {
  const wrapper = input.closest(".p-form-validation");
  let valid = false;

  if (wrapper) {
    const messageEl = wrapper.querySelector(".p-form-validation__message");

    if (!input.checkValidity()) {
      if (highlightError) {
        wrapper.classList.add("is-error");
        messageEl.classList.remove("u-hide");
        messageEl.innerHTML = input.validationMessage;
      }
    } else {
      wrapper.classList.remove("is-error");
      messageEl.classList.add("u-hide");
      messageEl.innerHTML = "";

      valid = true;
    }

    validateForm();
  }

  return valid;
}

attachCTAevents();
attachFormEvents();
attachModalButtonEvents();
setupCardElements();
validateForm();
