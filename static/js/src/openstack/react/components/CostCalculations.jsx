import React from "react";
import { Row, Col, Button } from "@canonical/react-components";

import COST_VARIABLES from "../utils/variables";

const CostCalculations = (formState) => {
  const charmedOpenstackTCO = 3;

  const hourlyCostPerInstance =
    charmedOpenstackTCO /
    formState.instances /
    (8760 * COST_VARIABLES.operations.hardWareRenewalPeriod);

  return (
    <>
      <Row>
        <hr />
        <Col size="12" className="u-align--right">
          <p className="p-heading--4">
            Hourly cost per instance:{hourlyCostPerInstance}
          </p>
          <p className="p-heading--4">
            Total savings compared to public clouds: $907,656
          </p>
          <Button appearance="positive">Email me those estimates</Button>
        </Col>
      </Row>
    </>
  );
};

export default CostCalculations;
