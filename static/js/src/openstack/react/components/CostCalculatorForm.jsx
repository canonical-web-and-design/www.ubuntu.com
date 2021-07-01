import React, { useState } from "react";
import {
  Row,
  Col,
  Slider,
  Input,
  Form,
  Tooltip,
  Icon,
} from "@canonical/react-components";

import CostCalculations from "./CostCalculations";

const CostCalculatorForm = () => {
  const [formState, setFormState] = useState({
    instances: { value: 1000, error: "" },
    vcpus: { value: 2, error: "" },
    emepheralStorage: { value: 8, error: "" },
    ram: { value: 8, error: "" },
    persistentStorage: { value: 80, error: "" },
    supportLevel: "fully-managed",
  });

  const onChangeHandler = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;

    const error =
      parseInt(e.target.value) < parseInt(e.target.min) ||
      parseInt(e.target.value) > parseInt(e.target.max) ||
      e.target.value === ""
        ? `Please enter a value between ${e.target.min} and ${e.target.max}`
        : false;

    e.target.name !== "supportLevel"
      ? setFormState({
          ...formState,
          [e.target.name]: { value: parseInt(value), error: error },
        })
      : setFormState({ ...formState, supportLevel: value });
  };

  return (
    <>
      <Form>
        <Row>
          <Col size="6">
            <h3>
              Number of instances
              <Tooltip
                position="top-right"
                message="A number of virtual machines that will run in the cloud."
              >
                <Icon name="help" className="tco-tooltip" />
              </Tooltip>
            </h3>
            <Slider
              max={10000}
              mdxType="Slider"
              min={1}
              name="instances"
              onChange={onChangeHandler}
              showInput
              value={formState.instances.value}
              error={formState.instances.error}
              ariaLabel="Number of instances"
              required
            />
            <h3>
              Instance type
              <Tooltip
                position="top-right"
                message=" Average virtual machine resources configuration."
              >
                <Icon name="help" className="tco-tooltip" />
              </Tooltip>
            </h3>
            <Row>
              <Col size="3">
                <Row>
                  <Col size="3">
                    <p>vCPUs</p>
                  </Col>
                  <Col size="2">
                    <Input
                      id="vcpus"
                      ariaLabel="vCPUs"
                      mdxType="Input"
                      onChange={onChangeHandler}
                      type="number"
                      min="1"
                      max="116"
                      name="vcpus"
                      value={formState.vcpus.value}
                      error={formState.vcpus.error}
                      required
                    ></Input>
                  </Col>
                </Row>
              </Col>
              <Col size="3">
                <Row>
                  <Col size="3">
                    <p>Emepheral storage [GB]</p>
                  </Col>
                  <Col size="2">
                    <Input
                      id="ephemeral-storage"
                      ariaLabel="Emepheral storage"
                      mdxType="Input"
                      onChange={onChangeHandler}
                      type="number"
                      min="4"
                      max="114"
                      name="emepheralStorage"
                      value={formState.emepheralStorage.value}
                      error={formState.emepheralStorage.error}
                      required
                    ></Input>
                  </Col>
                </Row>
              </Col>
            </Row>
            <Row>
              <Col size="3">
                <Row>
                  <Col size="3">
                    <p>RAM [GB]</p>
                  </Col>
                  <Col size="2">
                    <Input
                      id="ram"
                      ariaLabel="RAM [GB]"
                      mdxType="Input"
                      onChange={onChangeHandler}
                      type="number"
                      min="1"
                      max="1824"
                      name="ram"
                      value={formState.ram.value}
                      error={formState.ram.error}
                      required
                    ></Input>
                  </Col>
                </Row>
              </Col>
              <Col size="3">
                <Row>
                  <Col size="3">
                    <p>Persistent storage [GB]</p>
                  </Col>
                  <Col size="2">
                    <Input
                      id="persistent-storage"
                      ariaLabel="Persistent storage [GB]"
                      mdxType="Input"
                      onChange={onChangeHandler}
                      type="number"
                      min="0"
                      max="221"
                      name="persistentStorage"
                      value={formState.persistentStorage.value}
                      error={formState.persistentStorage.error}
                      required
                    ></Input>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Col>
          <Col size="6">
            <Row>
              <Col size="5" emptyLarge="2">
                <h3>
                  Support level
                  <Tooltip
                    position="top-right"
                    message=" Average virtual machine resources configuration."
                  >
                    <Icon name="help" className="tco-tooltip" />
                  </Tooltip>
                </h3>
                <Input
                  label="Fully-managed"
                  type="radio"
                  id="fully-managed"
                  value="fully-managed"
                  name="supportLevel"
                  onChange={onChangeHandler}
                  checked={formState.supportLevel === "fully-managed"}
                  default
                />
                <p>
                  Canonical deploys the cloud and provides 24/7 maintenance and
                  operations of the cloud. The more economical option for
                  small-scale deployments.
                </p>
                <Input
                  label="Supported"
                  type="radio"
                  id="supported"
                  value="supported"
                  name="supportLevel"
                  onChange={onChangeHandler}
                  checked={formState.supportLevel === "supported"}
                />
                <p>
                  Canonical deploys the cloud and provides 24/7 phone and ticket
                  support for your operations team. The more economical option
                  for large-scale deployments.
                </p>
              </Col>
            </Row>
          </Col>
        </Row>
      </Form>
      <CostCalculations {...formState} />
    </>
  );
};

export default CostCalculatorForm;
