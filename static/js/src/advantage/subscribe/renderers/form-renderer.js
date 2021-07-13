import versionDetails from "./version-details";

export const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const form = document.querySelector(".js-shop-form");

function renderRadios(state, sections) {
  sections.forEach((section) => {
    const radios = section.querySelectorAll(".js-radio");
    const step = section.dataset.step;
    radios.forEach((radio) => {
      const input = radio.querySelector("input");
      if (input.value === state[step]) {
        radio.classList.add("is-selected");
        input.checked = "true";
      } else {
        radio.classList.remove("is-selected");
      }
    });
  });
}

function renderVersionDetails(state) {
  const details = versionDetails[state.version];
  const container = form.querySelector("#version-details");
  const versionNumber = form.querySelector("#version-number");
  var innerHTML = "";
  details.forEach((detail) => {
    innerHTML += `<li class="p-list__item is-ticked">
                    ${detail}
                  </li>`;
  });
  container.innerHTML = innerHTML;
  versionNumber.innerHTML = state.version;
}

function renderPublicClouds(state, sections) {
  const type = state.type;
  const awsSection = form.querySelector("#aws-public-cloud");
  const azureSection = form.querySelector("#azure-public-cloud");
  const gcpSection = form.querySelector("#gcp-public-cloud");

  // Show the public cloud section
  if (type === "aws") {
    awsSection.classList.remove("u-hide");
    azureSection.classList.add("u-hide");
    gcpSection.classList.add("u-hide");
  } else if (type === "azure") {
    azureSection.classList.remove("u-hide");
    awsSection.classList.add("u-hide");
    gcpSection.classList.add("u-hide");
  } else if (type === "gcp") {
    gcpSection.classList.remove("u-hide");
    awsSection.classList.add("u-hide");
    azureSection.classList.add("u-hide");
  } else {
    awsSection.classList.add("u-hide");
    azureSection.classList.add("u-hide");
    gcpSection.classList.add("u-hide");
  }

  // Disable the rest of the form
  if (type === "aws" || type === "azure" || type === "gcp") {
    sections.forEach((section) => {
      if (section.dataset.step !== "type") {
        section.classList.add("u-disable");
      }
    });
  } else {
    sections.forEach((section) => {
      section.classList.remove("u-disable");
    });
  }
}

function renderFeature(state) {
  const featureSection = form.querySelector(
    ".js-form-section[data-step=feature]"
  );
  const radios = featureSection.querySelectorAll(".js-radio");

  // Disable infra + apps if desktop is selected
  if (state.type === "desktop") {
    radios.forEach((radio) => {
      const input = radio.querySelector("input");
      if (input.value === "infra+apps") {
        radio.classList.add("u-disable");
      }
    });
  } else {
    radios.forEach((radio) => {
      radio.classList.remove("u-disable");
    });
  }
}

function setSupportCost(state, support) {
  const element = form.querySelector(`#${support}-support-costs`);
  const value = state.product.supportPriceRange[support];
  element.innerHTML = value
    ? `+${formatter.format(value / 100)} per machine per year`
    : "";
}

function renderSupport(state) {
  const supportSection = form.querySelector(
    ".js-form-section[data-step=support]"
  );
  const radios = supportSection.querySelectorAll(".js-radio");

  setSupportCost(state, "standard");
  setSupportCost(state, "advanced");

  // disable all the options but essential if desktop and apps are selected
  if (state.type === "desktop" && state.feature === "apps") {
    radios.forEach((radio) => {
      const input = radio.querySelector("input");
      if (input.value !== "essential") {
        radio.classList.add("u-disable");
      }
    });
  } else {
    radios.forEach((radio) => {
      radio.classList.remove("u-disable");
    });
  }
}

function renderQuantity(state) {
  const quantity = state.quantity;
  const quantityInput = form.querySelector("#quantity-input");
  if (quantityInput !== document.activeElement) {
    quantityInput.value = quantity;
  }
}

const imgUrl = {
  physical: "https://assets.ubuntu.com/v1/fdf83d49-Server.svg",
  virtual: "https://assets.ubuntu.com/v1/9ed50294-Virtual+machine.svg",
  desktop: "https://assets.ubuntu.com/v1/4b732966-Laptop.svg",
};

function renderSummary(state) {
  const billing = state.billing;
  const periods = state.periods;
  const type = state.type;
  const quantity = state.quantity;
  const summarySection = form.querySelector("#summary-section");
  const saveMessage = summarySection.querySelector("#summary-save-with-annual");
  const billingSection = summarySection.querySelector(".js-summary-billing");
  const billingSelect = summarySection.querySelector("select#billing-period");
  const nextStepButton = summarySection.querySelector("#next-step-button");

  if (!state.product.ok || quantity <= 0) {
    summarySection.classList.add("p-shop-cart--hidden");
    nextStepButton.classList.add("u-disable");
  } else {
    // if the selection matches a product we populate the 'cart' section and show it
    const image = summarySection.querySelector("#summary-plan-image");
    const title = summarySection.querySelector("#summary-plan-name");
    const freeTrialLabel = summarySection.querySelector(
      "#summary-free-trial-label"
    );
    const costElement = summarySection.querySelector(".js-summary-cost");
    const quantityElement = summarySection.querySelector(
      "#summary-plan-quantity"
    );
    const price = state.product.price.value;

    summarySection.classList.remove("p-shop-cart--hidden");
    quantityElement.innerHTML = `${quantity}x`;
    image.setAttribute("src", imgUrl[type]);
    title.innerHTML = state.product.name;
    if (state.product.canBeTrialled) {
      freeTrialLabel.classList.remove("u-hide");
    } else {
      freeTrialLabel.classList.add("u-hide");
    }
    costElement.innerHTML = `${formatter.format((price / 100) * quantity)} / ${
      billing === "monthly" ? "month" : "year"
    }`;

    const previous_purchase_id = window.previousPurchaseIds[billing];

    // We add the data to the button so the modal can pick it up
    nextStepButton.classList.remove("u-disable");
    const productObject = JSON.stringify(state.product);
    nextStepButton.dataset.product = productObject;
    nextStepButton.dataset.quantity = quantity;
    nextStepButton.dataset.accountId = window.accountId;
    nextStepButton.dataset.previousPurchaseId = previous_purchase_id;
  }

  if (periods.length > 1) {
    billingSection.classList.remove("u-hide");
    let options = "";
    periods.forEach((period) => {
      if (period === "monthly") {
        options += `<option value="monthly">Monthly billing</option>`;
      } else if (period === "yearly") {
        options += `<option value="yearly">Annual billing</option>`;
      }
    });
    billingSelect.innerHTML = options;
  } else {
    billingSection.classList.add("u-hide");
  }

  if (billing === "yearly") {
    saveMessage.classList.add("u-hide");
  } else {
    saveMessage.classList.remove("u-hide");
  }

  billingSelect.value = billing;
}

export default function render(state) {
  const sections = form.querySelectorAll(".js-form-section");
  renderRadios(state, sections);
  renderVersionDetails(state);
  renderPublicClouds(state, sections);
  renderFeature(state);
  renderSupport(state);
  renderQuantity(state);
  renderSummary(state);
}
