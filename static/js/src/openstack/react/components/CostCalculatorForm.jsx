import React, { useState } from "react";
import { Row, Col, Slider, Input, Form } from "@canonical/react-components";

import CostCalculations from "./CostCalculations";

const CostCalculatorForm = () => {
  const [formState, setFormState] = useState({
    instances: 1000,
    vcpus: 2,
    emepheralStorage: 8,
    ram: 2,
    persistentStorage: 80,
    supportLevel: "fully-managed",
  });

  const onChangeHandler = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFormState({
      ...formState,
      [e.target.name]: value,
    });
  };

  return (
    <>
      <Form>
        <Row>
          <Col size="6">
            <Slider
              label="Number of instances"
              max={10000}
              mdxType="Slider"
              min={0}
              name="instances"
              onChange={onChangeHandler}
              showInput
              value={formState.instances}
            />
            <h3>Instance type</h3>
            <Row>
              <Col size="2">
                <Input
                  id="vcpus"
                  label="vCPUs"
                  mdxType="Input"
                  onChange={onChangeHandler}
                  type="number"
                  min="1"
                  max="116"
                  name="vcpus"
                  value={formState.vcpus}
                ></Input>
              </Col>
              <Col size="2">
                <Input
                  id="ephemeral-storage"
                  label="Ephemeral storage"
                  mdxType="Input"
                  onChange={onChangeHandler}
                  type="number"
                  min="4"
                  max="114"
                  name="emepheralStorage"
                  value={formState.emepheralStorage}
                ></Input>
              </Col>
            </Row>
            <Row>
              <Col size="2">
                <Input
                  id="ram"
                  label="RAM"
                  mdxType="Input"
                  onChange={onChangeHandler}
                  type="number"
                  min="1"
                  max="1824"
                  name="ram"
                  value={formState.ram}
                ></Input>
              </Col>
              <Col size="2">
                <Input
                  id="persistent-storage"
                  label="Persistent storage"
                  mdxType="Input"
                  onChange={onChangeHandler}
                  type="number"
                  min="0"
                  max="221"
                  name="persistentStorage"
                  value={formState.persistentStorage}
                ></Input>
              </Col>
            </Row>
          </Col>
          <Col size="6">
            <h3>Support level</h3>
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
              support for your operations team. The more economical option for
              large-scale deployments.
            </p>
          </Col>
        </Row>
      </Form>
      <CostCalculations {...formState} />
    </>
  );
};

export default CostCalculatorForm;
