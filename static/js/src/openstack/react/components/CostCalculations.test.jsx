import React from "react";
import { shallow } from "enzyme";
import CostCalculatorForm from "./CostCalculatorForm";
import CostCalculations from "./CostCalculations";

describe("Hourly cost and total savings calculations", function () {
  let formWrapper;
  let calculationsWrapper;

  beforeEach(() => {
    formWrapper = shallow(<CostCalculatorForm />);
    calculationsWrapper = shallow(
      <CostCalculations
        instances={{ value: 1000, error: "" }}
        vcpus={{ value: 2, error: "" }}
        emepheralStorage={{ value: 8, error: "" }}
        ram={{ value: 8, error: "" }}
        persistentStorage={{ value: 80, error: "" }}
        supportLevel="fully-managed"
      />
    );
  });

  afterEach(() => {
    formWrapper.unmount();
  });

  it("checks totals are correct with default values", () => {
    expect(calculationsWrapper.find("#hourly-cost").text()).toEqual("$0.0407");
    expect(calculationsWrapper.find("#total-savings").text()).toEqual(
      "$907,656.00"
    );
  });

  it("checks totals are correct with updated values", () => {
    calculationsWrapper = shallow(
      <CostCalculations
        instances={{ value: 2000, error: "" }}
        vcpus={{ value: 8, error: "" }}
        emepheralStorage={{ value: 16, error: "" }}
        ram={{ value: 32, error: "" }}
        persistentStorage={{ value: 120, error: "" }}
        supportLevel="supported"
      />
    );
    expect(calculationsWrapper.find("#hourly-cost").text()).toEqual("$0.1496");
    expect(calculationsWrapper.find("#total-savings").text()).toEqual(
      "$7,949,548.00"
    );
  });

  it("checks totals are correct with more updated values", () => {
    calculationsWrapper = shallow(
      <CostCalculations
        instances={{ value: 9000, error: "" }}
        vcpus={{ value: 32, error: "" }}
        emepheralStorage={{ value: 64, error: "" }}
        ram={{ value: 8, error: "" }}
        persistentStorage={{ value: 210, error: "" }}
        supportLevel="fully-managed"
      />
    );
    expect(calculationsWrapper.find("#hourly-cost").text()).toEqual("$0.2756");
    expect(calculationsWrapper.find("#total-savings").text()).toEqual(
      "$219,403,189.00"
    );
  });

  it("checks instances prop value updates onChange", () => {
    formWrapper
      .find("#instances")
      .simulate("change", { target: { value: 2000, name: "instances" } });

    expect(formWrapper.find("#instances").props().value).toEqual(2000);
  });

  it("checks vcupus prop value updates onChange", () => {
    formWrapper
      .find("#vcpus")
      .simulate("change", { target: { value: 6, name: "vcpus" } });

    expect(formWrapper.find("#vcpus").props().value).toEqual(6);
  });

  it("checks emepheral storage prop value updates onChange", () => {
    formWrapper
      .find("#emepheral-storage")
      .simulate("change", { target: { value: 12, name: "emepheralStorage" } });

    expect(formWrapper.find("#emepheral-storage").props().value).toEqual(12);
  });

  it("checks ram prop value updates onChange", () => {
    formWrapper
      .find("#ram")
      .simulate("change", { target: { value: 12, name: "ram" } });

    expect(formWrapper.find("#ram").props().value).toEqual(12);
  });

  it("checks persistent storage prop value updates onChange", () => {
    formWrapper
      .find("#persistent-storage")
      .simulate("change", { target: { value: 90, name: "persistentStorage" } });

    expect(formWrapper.find("#persistent-storage").props().value).toEqual(90);
  });

  it("checks error message exists when instances value is out of range", () => {
    formWrapper
      .find("#instances")
      .simulate("change", { target: { value: 0, name: "instances" } });

    expect(formWrapper.find(".p-form-validation__message")).toBeTruthy();
  });

  it("checks error message exists when vcpus value is out of range", () => {
    formWrapper
      .find("#vcpus")
      .simulate("change", { target: { value: 10000, name: "vcpus" } });

    expect(formWrapper.find(".p-form-validation__message")).toBeTruthy();
  });

  it("checks error message exists when emepheral storage value is out of range", () => {
    formWrapper.find("#emepheral-storage").simulate("change", {
      target: { value: "", name: "emepheralStorage" },
    });

    expect(formWrapper.find(".p-form-validation__message")).toBeTruthy();
  });

  it("checks error message exists when ram value is out of range", () => {
    formWrapper.find("#ram").simulate("change", {
      target: { value: 376428, name: "ram" },
    });

    expect(formWrapper.find(".p-form-validation__message")).toBeTruthy();
  });

  it("checks error message exists when persistent storage value is out of range", () => {
    formWrapper.find("#persistent-storage").simulate("change", {
      target: { value: 0, name: "persistentStorage" },
    });

    expect(formWrapper.find(".p-form-validation__message")).toBeTruthy();
  });
});
