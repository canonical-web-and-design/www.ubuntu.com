import React from "react";
import { shallow } from "enzyme";
import CostCalculations from "./CostCalculations";

describe("Test calculator entry point", function () {
  it("should have a p tag with Hourly cost per instance", function () {
    const wrapper = shallow(<CostCalculations />);
    expect(wrapper.find("p").text()).toEqual("Hourly cost per instance:");
  });
});
