import {
  cancelContract,
  getPurchase,
  resizeContract,
} from "./contracts-api.js";

const stripe = window.Stripe(window.stripePublishableKey);

const getMessage = (code, default_message) => {
  const map = {
    resizing_machines_success:
      "Your changes were saved successfully, the page will reload.",
    cancelling_subscription_success:
      "Your subscription was cancelled, the page will reload.",
    resizing_machines_fail:
      "<strong>Payment method:</strong> There was problem with your payment. Please <a href='/account/payment-methods'>update your payment methods</a> to retry.",
    subscription_missing:
      "<strong>Could not cancel subscription:</strong> It could be that you have a pending payment that is blocking this action. Contact <a class='p-notification__action' href='https://ubuntu.com/contact-us'>Canonical sales</a> if the problem persists.",
    cancelling_subscription_failed:
      "<strong>Could not cancel subscription:</strong> Contact <a class='p-notification__action' href='https://ubuntu.com/contact-us'>Canonical sales</a> if the problem persists.",
    pending_purchase:
      "<strong>Error:</strong> You already have a pending purchase. Please go to <a href='/account/payment-methods'>payment methods</a> to retry.",
    unknown_error:
      "<strong>Unknown error:</strong> Contact <a class='p-notification__action' href='https://ubuntu.com/contact-us'>Canonical sales</a> if the problem persists.",
  };

  if (map[code]) {
    return map[code];
  }

  return default_message;
};

const handleSuccess = (elements, code) => {
  const message = getMessage(code, "Success!");

  elements["button"]["html"].classList.remove("is-processing");
  elements["button"]["html"].innerHTML = elements["button"]["text"];
  elements["caution"].forEach((element) => {
    element.classList.add("u-hide");
    element.querySelector(".p-notification__message").innerHTML = "";
  });
  elements["success"].forEach((element) => {
    element.classList.remove("u-hide");
    element.querySelector(".p-notification__message").innerHTML = message;
  });

  setTimeout(() => {
    location.reload();
  }, 2000);
};

const handleError = (elements, code) => {
  const message = getMessage(code, "Error!");

  elements["button"]["html"].classList.remove("is-processing");
  elements["button"]["html"].innerHTML = elements["button"]["text"];
  elements["button"]["html"].disabled = false;
  elements["success"].forEach((element) => {
    element.classList.add("u-hide");
    element.querySelector(".p-notification__message").innerHTML = "";
  });
  elements["caution"].forEach((element) => {
    element.classList.remove("u-hide");
    element.querySelector(".p-notification__message").innerHTML = message;
  });
};

const authenticate_3ds = (invoice, elements) => {
  stripe.confirmCardPayment(invoice.pi_secret).then(function (data) {
    if (data.error) {
      handleError(elements, "resizing_machines_fail");
    } else {
      handleSuccess(elements, "resizing_machines_success");
    }
  });
};

// It take a time for the invoice to be attached to the payment.
// We try 5 times each 2 seconds.
const retryGetPurchase = (purchaseId, attemptsCounter, elements) => {
  let maxNumberOfAttempts = 5;
  if (attemptsCounter > maxNumberOfAttempts) {
    handleError(elements, "resizing_machines_failed");
  }

  setTimeout(() => {
    getPurchase(purchaseId).then((purchase) => {
      if (purchase.status === "done") {
        handleSuccess(elements, "resizing_machines_success");

        return;
      }

      let invoice;

      if (purchase.stripeInvoices && purchase.stripeInvoices.length > 0) {
        invoice = purchase.stripeInvoices[0];
      }

      if (!invoice) {
        attemptsCounter++;
        retryGetPurchase(purchaseId, attemptsCounter);

        return;
      }

      if (invoice.pi_status === "requires_payment_method") {
        handleError(elements, "resizing_machines_fail");

        return;
      }

      if (requiresAuthentication(invoice)) {
        authenticate_3ds(invoice, elements);
      }
    });
  }, 2000);
};

const requiresAuthentication = (invoice) => {
  return (
    invoice.pi_decline_code === "authentication_required" ||
    (invoice.pi_status === "requires_action" && invoice.pi_secret)
  );
};

const handleUpdateClick = (id, VPSize) => {
  const resizeField = document.querySelector(
    `#resize-input--${id}[data-viewport="${VPSize}"]`
  );
  const updateButton = document.querySelector(
    `#save-changes--${id}[data-viewport="${VPSize}"]`
  );

  const {
    accountId,
    productListingId,
    previousPurchaseId,
    billingPeriod,
  } = updateButton.dataset;

  const successNotificationElements = document.querySelectorAll(
    `.success-${id}`
  );
  const cautionNotificationElements = document.querySelectorAll(
    `.caution-${id}`
  );

  const elements = {
    button: {
      html: updateButton,
      text: "Save changes",
    },
    success: successNotificationElements,
    caution: cautionNotificationElements,
  };

  dataLayer.push({
    event: "GAEvent",
    eventCategory: "Advantage",
    eventAction: "update-subscription",
    eventLabel: "Save changes",
    eventValue: undefined,
  });

  updateButton.classList.add("is-processing");
  updateButton.innerHTML =
    '<i class="p-icon--spinner u-animation--spin is-light"></i>';
  updateButton.disabled = true;

  resizeContract(
    accountId,
    previousPurchaseId,
    productListingId,
    resizeField.value,
    billingPeriod
  ).then((data) => {
    if (data.errors) {
      if (data.errors.includes("can only make one purchase")) {
        handleError(elements, "pending_purchase");

        setTimeout(() => {
          location.reload();
        }, 2000);
      } else {
        handleError(elements, "unknown_error");
      }
    } else {
      retryGetPurchase(data.id, 1, elements);
    }
  });
};

const cancelSubscription = (id, VPSize) => {
  const cancelSubscriptionButton = document.querySelector(
    `#cancel-subscription--${id}[data-viewport="${VPSize}"]`
  );
  const {
    accountId,
    productListingId,
    previousPurchaseId,
  } = cancelSubscriptionButton.dataset;
  const confirmCancelButton = document.querySelector(`#confirmCancelButton`);

  const successNotificationElements = document.querySelectorAll(
    `.success-${id}`
  );
  const cautionNotificationElements = document.querySelectorAll(
    `.caution-${id}`
  );

  const elements = {
    button: {
      html: confirmCancelButton,
      text: "Cancel subscription",
    },
    success: successNotificationElements,
    caution: cautionNotificationElements,
  };

  dataLayer.push({
    event: "GAEvent",
    eventCategory: "Advantage",
    eventAction: "cancel-subscription",
    eventLabel: "Cancel subscription",
    eventValue: undefined,
  });

  confirmCancelButton.classList.add("is-processing");
  confirmCancelButton.innerHTML =
    '<i class="p-icon--spinner u-animation--spin is-light"></i>';
  confirmCancelButton.disabled = true;

  cancelContract(accountId, previousPurchaseId, productListingId).then(
    (data) => {
      if (data.errors) {
        if (data.errors.includes("no monthly subscription")) {
          handleError(elements, "subscription_missing");
        } else {
          handleError(elements, "cancelling_subscription_failed");
        }
      } else {
        handleSuccess(elements, "cancelling_subscription_success");
      }
    }
  );
};

const createModal = (id, VPSize) => {
  const cancelSubscriptionButton = document.querySelector(
    `#cancel-subscription--${id}[data-viewport="${VPSize}"]`
  );

  const { contractName, machineCount } = cancelSubscriptionButton.dataset;

  const container = document.createElement("div");
  container.classList.add("p-modal");

  const goBackButton = document.createElement("button");
  goBackButton.classList.add("p-button--neutral");
  goBackButton.textContent = "Go back";

  goBackButton.onclick = () => {
    document.body.removeChild(container);
  };

  const confirmCancelButton = document.createElement("button");
  confirmCancelButton.id = "confirmCancelButton";
  confirmCancelButton.classList.add("p-button--negative");
  confirmCancelButton.disabled = true;
  confirmCancelButton.textContent = "Yes, cancel subscription";

  confirmCancelButton.onclick = () => {
    cancelSubscription(id, VPSize);
    document.body.removeChild(container);
  };

  const confirmCancelField = document.createElement("input");
  confirmCancelField.type = "text";
  confirmCancelField.name = "confirm-cancel";

  confirmCancelField.oninput = (e) => {
    confirmCancelButton.disabled = e.target.value.toLowerCase() !== "cancel";
  };

  container.innerHTML = `
    <div class="p-modal__dialog" role="dialog" aria-labelledby="modal-title" style="overflow: auto;">
      <header class="p-modal__header">
        <h2 class="p-modal__title ">
          Cancel subscription ${contractName}
        </h2>
      </header>
      <div id="modal-description" class="p-modal__body">
        <p>If you cancel this subscription:</p>
        <ul>
          <li>No additional charge will be incurred.</li>
          <li>The ${
            machineCount > 1
              ? `<strong>${machineCount} machines</strong>`
              : "<strong>machine</strong>"
          } will stop receiving updates and services at the end of the billing period.</li>
          </ul>
        <p>Want help or advice? <a href="/contact-us">Chat with us</a>.</p>
        <div id="cancel-modal-field-wrapper" class="u-align--right">
          <label for="confirm-cancel">Please type <strong>cancel</strong> to confirm.</label>
        </div>
        <div id="cancel-modal-buttons-wrapper" class="u-align--right">
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const fieldWrapper = document.querySelector("#cancel-modal-field-wrapper");
  fieldWrapper.appendChild(confirmCancelField);

  const buttonWrapper = document.querySelector("#cancel-modal-buttons-wrapper");
  buttonWrapper.appendChild(goBackButton);
  buttonWrapper.appendChild(confirmCancelButton);
};

const handleCancelChangesClick = (id, VPSize) => {
  // Hide edit options
  const previewSection = document.querySelector(
    `#view-mode--${id}[data-viewport="${VPSize}"]`
  );
  const editSection = document.querySelector(
    `#edit-mode--${id}[data-viewport="${VPSize}"]`
  );
  previewSection.classList.remove("u-hide");
  editSection.classList.add("u-hide");

  // Reset input and help text
  const resizeField = document.querySelector(
    `#resize-input--${id}[data-viewport="${VPSize}"]`
  );
  resizeField.oninput = () => {};
  resizeField.value = resizeField.defaultValue;
  const resizeSummary = document.querySelector(
    `#resize-summary--${id}[data-viewport="${VPSize}"]`
  );
  const newPayment = document.querySelector(
    `#new-payment--${id}[data-viewport="${VPSize}"]`
  );
  const updateButton = document.querySelector(
    `#save-changes--${id}[data-viewport="${VPSize}"]`
  );
  resizeSummary.classList.add("u-hide");
  newPayment.classList.add("u-hide");
  updateButton.disabled = true;

  // Remove buttons handlers
  const cancelSubscriptionButton = document.querySelector(
    `#cancel-subscription--${id}[data-viewport="${VPSize}"]`
  );
  const cancelChangesButton = document.querySelector(
    `#cancel-changes--${id}[data-viewport="${VPSize}"]`
  );
  updateButton.onclick = () => {};
  cancelChangesButton.onclick = () => {};
  if (cancelSubscriptionButton) cancelSubscriptionButton.onclick = () => {};

  const cautionNotificationElements = document.querySelectorAll(
    `.caution-${id}`
  );

  cautionNotificationElements.forEach((element) => {
    element.classList.add("u-hide");
    element.querySelector(".p-notification__message").innerHTML = "";
  });
};

const handleChange = (e, id, VPSize) => {
  const defaultValue = Number.parseInt(e.target.defaultValue);
  let newValue = Number.parseInt(e.target.value);

  const unitPrice = Number.parseFloat(e.target.dataset.unitPrice / 100);
  const nextPayment = Number.parseFloat(
    e.target.dataset.nextPayment.split(" ")[0]
  );
  const billingPeriod = e.target.dataset.billingPeriod;

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  const resizeSummary = document.querySelector(
    `#resize-summary--${id}[data-viewport="${VPSize}"]`
  );
  const newPayment = document.querySelector(
    `#new-payment--${id}[data-viewport="${VPSize}"]`
  );
  const updateButton = document.querySelector(
    `#save-changes--${id}[data-viewport="${VPSize}"]`
  );

  const { min, max } = e.target;

  const valid = newValue >= min && newValue <= max;

  const deltaMachines = newValue - defaultValue;

  if (deltaMachines !== 0 && !isNaN(newValue) && valid) {
    resizeSummary.classList.remove("u-hide");
    newPayment.classList.remove("u-hide");
    updateButton.disabled = false;

    if (deltaMachines > 0) {
      resizeSummary.innerHTML = `Your changes will add UA for ${deltaMachines} machines`;
      newPayment.innerHTML = `Your ${billingPeriod} payment will be <strong>increased by ${formatter.format(
        unitPrice * deltaMachines
      )}${
        billingPeriod === "monthly"
          ? `, to ${formatter.format(
              unitPrice * deltaMachines + nextPayment
            )} per month</strong>.`
          : ` per year</strong>. <br/>A payment of ${formatter.format(
              unitPrice * deltaMachines
            )} will be charged immediately`
      }`;
    } else {
      //Downsizing is only for monthly contracts
      resizeSummary.innerHTML = `Your changes will remove UA for ${
        deltaMachines * -1
      } machines`;
      newPayment.innerHTML = `Your monthly payment will be <strong>reduced by ${formatter.format(
        unitPrice * (deltaMachines * -1)
      )}, to ${formatter.format(
        unitPrice * deltaMachines + nextPayment
      )} per month</strong>. <br/>Unused credit will be applied to next month’s invoice.`;
    }
  } else {
    resizeSummary.classList.add("u-hide");
    newPayment.classList.add("u-hide");
    updateButton.disabled = true;
  }
};

const handleBlur = (e, id, VPSize) => {
  const defaultValue = Number.parseInt(e.target.defaultValue);
  let newValue = Number.parseInt(e.target.value);

  const { min, max } = e.target;

  if (newValue < min) {
    newValue = Number.parseInt(min);
    e.target.value = min;
  }

  if (newValue > max) {
    newValue = Number.parseInt(max);
    e.target.value = max;
  }

  if (isNaN(newValue)) {
    e.target.value = defaultValue;
  }

  handleChange(e, id, VPSize);
};

function handleChangeClick() {
  const id = this.dataset.id;
  const VPSize = this.dataset.viewport;
  const updateButton = document.querySelector(
    `#save-changes--${id}[data-viewport="${VPSize}"]`
  );
  const cancelChangesButton = document.querySelector(
    `#cancel-changes--${id}[data-viewport="${VPSize}"]`
  );
  const cancelSubscriptionButton = document.querySelector(
    `#cancel-subscription--${id}[data-viewport="${VPSize}"]`
  );
  const resizeField = document.querySelector(
    `#resize-input--${id}[data-viewport="${VPSize}"]`
  );

  // Show edit options
  const previewSection = document.querySelector(
    `#view-mode--${id}[data-viewport="${VPSize}"]`
  );
  const editSection = document.querySelector(
    `#edit-mode--${id}[data-viewport="${VPSize}"]`
  );
  previewSection.classList.add("u-hide");
  editSection.classList.remove("u-hide");

  resizeField.oninput = (e) => {
    handleChange(e, id, VPSize);
  };

  resizeField.onblur = (e) => {
    handleBlur(e, id, VPSize);
  };

  cancelChangesButton.onclick = () => {
    handleCancelChangesClick(id, VPSize);
  };

  updateButton.onclick = () => {
    handleUpdateClick(id, VPSize);
  };

  if (cancelSubscriptionButton) {
    cancelSubscriptionButton.onclick = () => {
      const cautionNotificationElements = document.querySelectorAll(
        `.caution-${id}`
      );

      cautionNotificationElements.forEach((element) => {
        element.classList.add("u-hide");
        element.querySelector(".p-notification__message").innerHTML = "";
      });

      createModal(id, VPSize);
    };
  }

  dataLayer.push({
    event: "GAEvent",
    eventCategory: "Advantage",
    eventAction: "show-subscription-options",
    eventLabel: "Change subscription",
    eventValue: undefined,
  });
}

const editButtons = document.querySelectorAll(".js-change-subscription-button");

editButtons.forEach((button) => {
  button.addEventListener("click", handleChangeClick);
});
