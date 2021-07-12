import { add, format } from "date-fns";

import {
  getPaymentInformation,
  getRenewalInformation,
  getOrderInformation,
} from "../set-modal-info.js";

import * as orderData from "./fixtures/order-data.js";
import * as paymentMethods from "./fixtures/payment-methods.js";
import * as renewalData from "./fixtures/renewal-data.js";

describe("getPaymentInformation", () => {
  describe("given a visa payment method object", () => {
    it("should return an object of appropriate values that can be added to the DOM", () => {
      expect(getPaymentInformation(paymentMethods.visa)).toEqual({
        cardText: "Visa ending 6789",
        cardExpiry: "04/29",
        cardImage: "832cf121-visa.png",
        email: "hello@example.com",
        name: "Joe Bloggs",
      });
    });
  });

  describe("given a payment method object with a brand we don't recognise", () => {
    it("should return an object of appropriate values that can be added to the DOM", () => {
      expect(getPaymentInformation(paymentMethods.unknownBrand)).toEqual({
        cardText: "Foo ending 6789",
        cardExpiry: "04/29",
        cardImage: null,
        email: "hello@example.com",
        name: "Joe Bloggs",
      });
    });
  });
});

describe("getRenewalInformation", () => {
  describe("given a renewal data object", () => {
    it("should return an object of appropriate values that can be added to the DOM", () => {
      expect(getRenewalInformation(renewalData.advancedDesktop)).toEqual({
        items: [
          {
            end: {
              label: "Ends:",
              value: "18 August 2020",
              extraClasses: "js-end-date",
            },
            plan: {
              label: "Plan type:",
              value: "UA Infra Advanced Desktop",
            },
            quantity: {
              label: "Machines:",
              value: "5 &#215; US$25/year",
            },
            start: {
              label: "Continues from:",
              value: "18 April 2020",
            },
          },
        ],
        subtotal: "$125",
        total: "$125",
        vat: "$0",
      });
    });
  });
});

describe("getOrderInformation", () => {
  describe("given an order data object", () => {
    it("should return an object of appropriate values that can be added to the DOM", () => {
      const startDate = format(new Date(), "dd MMMM yyyy");
      const endDate = format(add(new Date(), { months: 12 }), "dd MMMM yyyy");

      expect(getOrderInformation(orderData.appsInfraServer)).toEqual({
        items: [
          {
            end: {
              label: "Next payment:",
              value: endDate,
              extraClasses: "js-end-date",
            },
            plan: {
              label: "Plan 1:",
              value: "UA Infra Advanced Server",
            },
            quantity: {
              label: "Machines:",
              value: "10 &#215; US$50/year",
            },
            start: {
              label: "Starts:",
              value: startDate,
            },
          },
          {
            end: {
              label: "Next payment:",
              value: endDate,
              extraClasses: "js-end-date",
            },
            plan: {
              label: "Plan 2:",
              value: "UA Apps Server",
            },
            quantity: {
              label: "Machines:",
              value: "10 &#215; US$50/year",
            },
            start: {
              label: "Starts:",
              value: startDate,
            },
          },
        ],
        subtotal: "$1,000",
      });
    });
  });
});
