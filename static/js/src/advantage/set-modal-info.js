import { add, format } from "date-fns";

const CARD_BRAND_IMAGES = {
  visa: "832cf121-visa.png",
  mastercard: "83a09dbe-mastercard.png",
  amex: "91e62c4f-amex.png",
};

const DATE_FORMAT = "dd MMMM yyyy";

const PRODUCT_NAMES = {
  "uai-essential-desktop": "UA Infra Essential Desktop",
  "uai-standard-desktop": "UA Infra Standard Desktop",
  "uai-advanced-desktop": "UA Infra Advanced Desktop",
  "uai-essential-physical-server": "UA Infra Essential Physical Server",
  "uai-standard-physical-server": "UA Infra Standar Physical Server",
  "uai-advanced-physical-server": "UA Infra Advance Physical Server",
  "uai-essential-virtual-server": "UA Infra Essential Virtual Server",
  "uai-standard-virtual-server": "UA Infra Standard Virtual Server",
  "uai-advanced-virtual-server": "UA Infra Advanced Virtual Server",
};

function buildInfoRow(item) {
  return `<div class="row u-no-padding u-sv1 ${item.extraClasses || ""}">
    <div class="col-3 u-text-light">${item.label}</div>
    <div class="col-9 js-info-value">${item.value}</div>
    ${
      item.info
        ? `<div class="col-start-large-4 col-9 js-info-supplemental">
            <small>${item.info}</small>
          </div>`
        : ""
    }
  </div>`;
}

function buildQuantityString(quantity, unitPrice, currency, period = "yearly") {
  return `${quantity} &#215; ${formattedCurrency(
    unitPrice,
    currency,
    "en-CA"
  )}/${period === "monthly" ? "month" : "year"}`;
}

function getProductsString(productsArrayString) {
  const arrayRegex = /[[\]']+/g;
  const isArray = arrayRegex.test(productsArrayString);
  let formattedString = "";

  if (isArray) {
    const productSlugs = productsArrayString
      .replace(arrayRegex, "")
      .split(", ");
    let products = [];

    productSlugs.forEach((slug) => {
      if (slug in PRODUCT_NAMES) {
        products.push(PRODUCT_NAMES[slug]);
      }
    });

    formattedString = products.join(", ");
  }

  return formattedString;
}

function formattedCurrency(amount, currency, locale) {
  const currencyString = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    currencyDisplay: "symbol",
  }).format(parseFloat(amount / 100));

  return currencyString.replace(".00", "");
}

function setModalTitle(title, modal) {
  const modalTitleEl = modal.querySelector("#modal-title");

  modalTitleEl.innerHTML = title;
}

function setSummaryInfo(summaryObject, modal) {
  const infoContainer = modal.querySelector("#order-info");
  const totalsContainer = modal.querySelector("#order-totals");

  // clear anything that was there previously
  infoContainer.innerHTML = "";
  totalsContainer.innerHTML = "";

  summaryObject.items.forEach((itemObject) => {
    const itemValues = Object.values(itemObject);

    itemValues.forEach((item) => {
      infoContainer.innerHTML += buildInfoRow(item);
    });

    if (summaryObject.items.length > 1) {
      infoContainer.innerHTML += "<span class='u-sv2'></span>";
    }
  });

  infoContainer.innerHTML += buildInfoRow({
    label: "Subtotal: ",
    value: "...",
    extraClasses: "js-subtotal",
  });

  totalsContainer.innerHTML += buildInfoRow({
    label: "VAT:",
    value: "...",
  });

  totalsContainer.innerHTML += buildInfoRow({
    label: "Total:",
    value: "...",
  });

  infoContainer.classList.remove("u-hide");
}

export function getOrderInformation(listings) {
  const items = [];
  const currency = "USD";
  const startDate = new Date();
  let endDate = add(new Date(), { months: 12 });
  let subtotal = 0;
  let planLabel = "Plan type:";

  listings.forEach((listing, i) => {
    subtotal = subtotal + listing.quantity * listing.product.price.value;
    if (listings.length > 1) {
      planLabel = `Plan ${i + 1}:`;
    }
    if (listing.product.period === "monthly") {
      endDate = add(new Date(), { months: 1 });
    }

    items.push({
      plan: {
        label: planLabel,
        value: listing.product.name,
      },
      quantity: {
        label: "Machines:",
        value: buildQuantityString(
          listing.quantity,
          listing.product.price.value,
          currency,
          listing.product.period
        ),
      },
      start: {
        label: "Starts:",
        value: format(startDate, DATE_FORMAT),
      },
      end: {
        label: "Next payment:",
        value: format(endDate, DATE_FORMAT),
        extraClasses: "js-end-date",
      },
    });
  });

  return {
    items: items,
    subtotal: formattedCurrency(subtotal, currency, "en-US"),
  };
}

export function getPaymentInformation(paymentMethod) {
  const billingInfo = paymentMethod.billing_details;
  const cardInfo = paymentMethod.card;

  const formattedExpiryMonth = cardInfo.exp_month.toString().padStart(2, "0");
  const formattedExpiryYear = cardInfo.exp_year.toString().slice(-2);

  const cardBrandFormatted =
    cardInfo.brand.charAt(0).toUpperCase() + cardInfo.brand.slice(1);

  return {
    cardText: `${cardBrandFormatted} ending ${cardInfo.last4}`,
    cardExpiry: `${formattedExpiryMonth}/${formattedExpiryYear}`,
    cardImage: CARD_BRAND_IMAGES[cardInfo.brand] || null,
    email: billingInfo.email,
    name: billingInfo.name,
  };
}

export function getRenewalInformation(data) {
  const startDate = new Date(data.renewalStart);
  const endDate = new Date(data.renewalEnd);

  return {
    items: [
      {
        plan: {
          label: "Plan type:",
          value: getProductsString(data.products),
        },
        quantity: {
          label: "Machines:",
          value: buildQuantityString(
            data.quantity,
            data.unitPrice,
            data.currency
          ),
        },
        start: {
          label: "Continues from:",
          value: format(startDate, DATE_FORMAT),
        },
        end: {
          label: "Ends:",
          value: format(endDate, DATE_FORMAT),
          extraClasses: "js-end-date",
        },
      },
    ],
    subtotal: formattedCurrency(data.total, data.currency, "en-US"),
    total: formattedCurrency(data.total, data.currency, "en-US"),
    vat: formattedCurrency(0, data.currency, "en-US"),
  };
}

export function setOrderInformation(listings, modal) {
  const orderSummary = getOrderInformation(listings);

  setModalTitle("Complete purchase", modal);
  setSummaryInfo(orderSummary, modal);
}

export function setOrderTotals(country, vatApplicable, purchasePreview, modal) {
  const currency = "USD";
  const totalsContainer = modal.querySelector("#order-totals");
  const subtotalLabel = modal.querySelector(".js-subtotal .u-text-light");
  const subtotalElement = modal.querySelector(".js-subtotal .js-info-value");
  const endDateElements = modal.querySelectorAll(".js-end-date .js-info-value");
  let proratedEndDate;
  let subtotalValue = "...";
  let taxValue = "...";
  let totalValue = "...";

  if (subtotalElement.innerHTML !== "...") {
    // if this is true, it means subtotal was
    // already filled in, and since it won't change,
    // force it to persist
    subtotalValue = subtotalElement.innerHTML;
  }

  if (purchasePreview) {
    let taxAmount = purchasePreview.taxAmount || 0;

    if (purchasePreview.subscriptionEndOfCycle) {
      proratedEndDate = format(
        new Date(purchasePreview.subscriptionEndOfCycle),
        DATE_FORMAT
      );
    }

    if (purchasePreview.total > 0) {
      // always show subtotal value if we have an amount
      subtotalValue = formattedCurrency(
        purchasePreview.total - taxAmount,
        currency,
        "en-US"
      );

      if (!vatApplicable) {
        // if VAT doesn't apply, total and subtotal are the same
        totalValue = subtotalValue;
      }

      if (vatApplicable && country !== "") {
        // if VAT applies to selected country, set the VAT
        // value, even if it's zero
        taxValue = formattedCurrency(taxAmount, currency, "en-US");
        totalValue = formattedCurrency(
          purchasePreview.total,
          currency,
          "en-US"
        );
      }
    }
  }

  totalsContainer.innerHTML = "";

  subtotalElement.innerHTML = subtotalValue;

  if (proratedEndDate) {
    for (let i = 0; i < endDateElements.length; i++) {
      let endDateEl = endDateElements[i];

      if (i === 0 && endDateEl.innerHTML !== proratedEndDate) {
        // if these are different, it means prorating
        // is in effect, so inform the user
        subtotalLabel.innerHTML = "For this period:";
        endDateEl.innerHTML = `${proratedEndDate}<br /><small>The same date as your existing subscription.</small>`;
      } else {
        endDateEl.innerHTML = proratedEndDate;
      }
    }
  }

  if (vatApplicable) {
    totalsContainer.innerHTML += buildInfoRow({
      label: "VAT: ",
      value: taxValue,
    });
  }

  if (taxValue === "...") {
    totalsContainer.innerHTML += buildInfoRow({
      label: "Total: ",
      value: `<b>${totalValue}</b>`,
      info: "Excluding VAT",
    });
  } else {
    totalsContainer.innerHTML += buildInfoRow({
      label: "Total: ",
      value: `<b>${totalValue}</b>`,
    });
  }

  totalsContainer.classList.remove("u-hide");
}

export function setPaymentInformation(paymentMethod, modal) {
  const paymentInfo = getPaymentInformation(paymentMethod);

  const cardExpiryEl = modal.querySelector(".js-customer-card-expiry");
  const cardImgEl = modal.querySelector(".js-customer-card-brand");
  const cardTextEl = modal.querySelector(".js-customer-card");
  const customerEmailEl = modal.querySelector(".js-customer-email");
  const customerNameEl = modal.querySelector(".js-customer-name");

  if (paymentInfo.cardImage) {
    cardImgEl.innerHTML = `<img src="https://assets.ubuntu.com/v1/${paymentInfo.cardImage}" />`;
    cardImgEl.classList.remove("u-hide");
  } else {
    cardImgEl.classList.add("u-hide");
  }

  cardTextEl.innerHTML = paymentInfo.cardText;
  cardExpiryEl.innerHTML = paymentInfo.cardExpiry;
  customerNameEl.innerHTML = paymentInfo.name;
  customerEmailEl.innerHTML = paymentInfo.email;
}

export function setRenewalInformation(data, modal) {
  const renewalSummary = getRenewalInformation(data);

  setModalTitle(`Renew &ldquo;${data.name}&rdquo;`, modal);
  setSummaryInfo(renewalSummary, modal);
}
