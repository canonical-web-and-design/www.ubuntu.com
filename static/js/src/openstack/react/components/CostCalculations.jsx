import PropTypes from "prop-types";
import React from "react";
import { Row, Col } from "@canonical/react-components";

import TCO_CONSTANTS from "../utils/constants";

const CostCalculations = ({
  instances,
  vcpus,
  emepheralStorage,
  ram,
  persistentStorage,
  supportLevel,
}) => {
  //RAM
  const amountOfRamInCloud = instances.value * ram.value;

  const amountOfRamInFullyUtilizedCloud =
    (amountOfRamInCloud * 100) /
    TCO_CONSTANTS.ratios.desiredCloudUtilisationRatio;

  const requiredAmountOfRam =
    amountOfRamInFullyUtilizedCloud /
    TCO_CONSTANTS.ratios.ramOvercommitmentRatio;

  const requiredNumberCloudNodesBasedOnRam = Math.ceil(
    requiredAmountOfRam /
      (TCO_CONSTANTS.storage.amountOfRamPerNode -
        TCO_CONSTANTS.storage.reservedAmountOfRamPerNode)
  );

  //vCPUs
  const numberOfVcpusInCloud = instances.value * vcpus.value;

  const numberOfVcpusInFullyUtilizedCloud =
    (numberOfVcpusInCloud * 100) /
    TCO_CONSTANTS.ratios.desiredCloudUtilisationRatio;

  const requiredNumberOfVcpus =
    numberOfVcpusInFullyUtilizedCloud /
    TCO_CONSTANTS.ratios.cpuOvercommitmentRatio;

  const requiredNoOfCpus =
    requiredNumberOfVcpus /
    (TCO_CONSTANTS.counts.numberOfThreadsPerCpu -
      TCO_CONSTANTS.counts.reservedNumberOfThreadsPerNode);

  const requiredNumberCloudNodesBasedOnCpu = Math.ceil(
    requiredNoOfCpus / TCO_CONSTANTS.counts.numberOfCpusPerNode
  );

  //Emepheral Storage
  const amountOfESInCloud = instances.value * emepheralStorage.value;

  const amountOfESInFullyUtilizedCloud =
    (amountOfESInCloud * 100) /
    TCO_CONSTANTS.ratios.desiredCloudUtilisationRatio;

  const requiredAmountOfES = amountOfESInFullyUtilizedCloud;

  const requiredNumberCloudNodesBasedOnES = Math.ceil(
    requiredAmountOfES /
      (TCO_CONSTANTS.storage.amountOfEphemeralStoragePerNode * 1024 -
        TCO_CONSTANTS.storage.reservedAmountOfEphemeralStoragePerNode)
  );

  //Persistent storage
  const amountOfPSInCloud = instances.value * persistentStorage.value;

  const amountOfPSInFullyUtilizedCloud =
    (amountOfPSInCloud * 100) /
    TCO_CONSTANTS.ratios.desiredCloudUtilisationRatio;

  const requiredAmountOfPS =
    amountOfPSInFullyUtilizedCloud *
    TCO_CONSTANTS.ratios.persistentStorageReplicationFactor;

  let requiredNumberCloudNodesBasedOnPS;
  TCO_CONSTANTS.storage.amountOfPersistentStoragePerNode > 0
    ? (requiredNumberCloudNodesBasedOnPS = Math.ceil(
        requiredAmountOfPS /
          1024 /
          TCO_CONSTANTS.storage.amountOfPersistentStoragePerNode
      ))
    : (requiredNumberCloudNodesBasedOnPS =
        TCO_CONSTANTS.storage.amountOfPersistentStoragePerNode);

  //total
  const requiredNumberOfCloudNodes = Math.max(
    requiredNumberCloudNodesBasedOnCpu,
    requiredNumberCloudNodesBasedOnRam,
    requiredNumberCloudNodesBasedOnES,
    requiredNumberCloudNodesBasedOnPS
  );

  const numberOfCloudNodes = Math.max(
    requiredNumberOfCloudNodes,
    TCO_CONSTANTS.counts.minimumNumberOfCloudNodes
  );

  //counts
  const numberOfRacks = Math.ceil(
    Math.max(
      numberOfCloudNodes / TCO_CONSTANTS.counts.maximumNumberOfCloudNodesInRack,
      TCO_CONSTANTS.counts.minimumNumberOfRacks
    )
  );

  const numberOfRackControllerNodes =
    numberOfRacks * TCO_CONSTANTS.counts.numberOfRackControllerNodesInRack;

  const numberOfSpineSwitches = Math.ceil(
    numberOfRacks / TCO_CONSTANTS.counts.numberOfRacksPerSpineSwitch
  );

  const numberOfLeafSwitches =
    numberOfRacks * TCO_CONSTANTS.counts.numberOfLeafSwitchesInRack;

  const numberOfManagementSwitches = Math.ceil(
    numberOfRacks / TCO_CONSTANTS.counts.numberOfRacksPerManagementSwitch
  );

  const numberOfNodes =
    numberOfCloudNodes +
    TCO_CONSTANTS.counts.numberOfInfraNodes +
    numberOfRackControllerNodes;

  //costs

  const calculatePriceOfNodes = (nodeCount, price) => {
    return nodeCount * price;
  };

  const cloudNodesCost = calculatePriceOfNodes(
    numberOfCloudNodes,
    TCO_CONSTANTS.price.pricePerCloudNode
  );

  const infraNodesCost = calculatePriceOfNodes(
    TCO_CONSTANTS.counts.numberOfInfraNodes,
    TCO_CONSTANTS.price.pricePerInfraNode
  );

  const rackControllerNodesCost = calculatePriceOfNodes(
    numberOfRackControllerNodes,
    TCO_CONSTANTS.price.pricePerRackController
  );

  const spineSwitchesCost = calculatePriceOfNodes(
    numberOfSpineSwitches,
    TCO_CONSTANTS.price.pricePerSpineSwitch
  );

  const leafSwitchesCost = calculatePriceOfNodes(
    numberOfLeafSwitches,
    TCO_CONSTANTS.price.pricePerLeafSwitch
  );

  const managementSwitchesCost = calculatePriceOfNodes(
    numberOfManagementSwitches,
    TCO_CONSTANTS.price.pricePerManagementSwitch
  );

  const totalHardwareCost =
    cloudNodesCost +
    infraNodesCost +
    rackControllerNodesCost +
    spineSwitchesCost +
    leafSwitchesCost +
    managementSwitchesCost;

  const capExCost = totalHardwareCost + TCO_CONSTANTS.price.deliveryCost;

  const totalInstallationAndMaintenanceCost =
    TCO_CONSTANTS.price.annualPerNodeHardwareInstallationAndMaintenanceCost *
    numberOfNodes;

  const totalHostingRentElectricityCost =
    TCO_CONSTANTS.price.annualPerNodeHostingRentAndElectricityCost *
    numberOfNodes;

  const totalHostingNetworkCost =
    2 *
    TCO_CONSTANTS.price.annualPerGbpsHostingExternalNetworkCost *
    TCO_CONSTANTS.operations.externalNetworkBandwidth;

  let totalSubscriptionCost;
  supportLevel === "fully-managed"
    ? (totalSubscriptionCost =
        numberOfNodes * TCO_CONSTANTS.operations.fullyManaged)
    : (totalSubscriptionCost =
        numberOfNodes * TCO_CONSTANTS.operations.supported);

  const totalStaffSalaryCost =
    TCO_CONSTANTS.operations.operationsTeamSize *
    TCO_CONSTANTS.price.operationsTeamAvarageAnnualStaffSalary;

  let totalOperationsCost;
  supportLevel === "fully-managed"
    ? (totalOperationsCost = totalSubscriptionCost)
    : (totalOperationsCost = totalSubscriptionCost + totalStaffSalaryCost);

  const opexCost =
    totalInstallationAndMaintenanceCost +
    totalHostingRentElectricityCost +
    totalHostingNetworkCost +
    totalOperationsCost +
    TCO_CONSTANTS.price.annualLicenseCost;

  const charmedOpenstackTco =
    capExCost + TCO_CONSTANTS.operations.hardWareRenewalPeriod * opexCost;

  //Number of AWS EC2 VMs

  const calculateNumberOfAWSVMs = (numberInCloud, storage) => {
    return storage === 0 ? 0 : Math.floor(numberInCloud / storage);
  };

  const numberOfAwsEc2VmsBasedOnCpu = calculateNumberOfAWSVMs(
    numberOfVcpusInCloud,
    TCO_CONSTANTS.storage.awsEc2InstanceVcpus
  );

  const numberOfAwsEc2VmsBasedOnRam = calculateNumberOfAWSVMs(
    amountOfRamInCloud,
    TCO_CONSTANTS.storage.awsEc2InstanceRam
  );

  const numberOfAwsEc2VmsBasedOnES = calculateNumberOfAWSVMs(
    amountOfESInCloud,
    TCO_CONSTANTS.storage.awsEc2InstanceEmepheralStorage
  );

  const numberOfAwsEc2VmsBasedOnPS = calculateNumberOfAWSVMs(
    amountOfPSInCloud,
    TCO_CONSTANTS.storage.awsEc2InstancePersistentStorage
  );

  const numberOfAwsEc2Vms = Math.max(
    numberOfAwsEc2VmsBasedOnCpu,
    numberOfAwsEc2VmsBasedOnRam,
    numberOfAwsEc2VmsBasedOnES,
    numberOfAwsEc2VmsBasedOnPS
  );

  const awsTco = Math.floor(
    Math.floor(
      numberOfAwsEc2Vms *
        8760 *
        TCO_CONSTANTS.price.awsEc2T3aLargeHourlyInstanceCost
    ) * TCO_CONSTANTS.operations.hardWareRenewalPeriod
  );

  //final calculations to display
  const hourlyCostPerInstance =
    charmedOpenstackTco /
    instances.value /
    (8760 * TCO_CONSTANTS.operations.hardWareRenewalPeriod);

  const totalSavings =
    awsTco - charmedOpenstackTco > 0 ? awsTco - charmedOpenstackTco : 0;

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  //error check
  let error = false;
  if (
    instances.error ||
    vcpus.error ||
    emepheralStorage.error ||
    ram.error ||
    persistentStorage.error
  ) {
    error = true;
  }

  return (
    <>
      <div className="u-fixed-width">
        <hr
          className="p-separator"
          style={{ marginBottom: "2rem", marginTop: "2rem" }}
        />
      </div>
      <Row>
        <Col size="10" className="u-align--right u-no-padding--right">
          <p className="p-heading--4">Hourly cost per instance:</p>
        </Col>
        <Col size="2" className="u-align--right">
          <p className="p-heading--4">
            {!error ? `$${hourlyCostPerInstance.toFixed(4)}` : "-"}
          </p>
        </Col>
      </Row>
      <Row>
        <Col size="10" className="u-align--right u-no-padding--right">
          <p className="p-heading--4">
            Total savings compared to public clouds:
          </p>
        </Col>
        <Col size="2" className="u-align--right">
          <p className="p-heading--4">
            {!error ? formatter.format(totalSavings) : "-"}
          </p>
        </Col>
      </Row>
      <Row>
        <Col size="12" className="u-align--right">
          <a className="js-invoke-modal p-button--positive">
            Email me those estimates
          </a>
        </Col>
      </Row>
    </>
  );
};

CostCalculations.propTypes = {
  instances: PropTypes.shape({
    value: PropTypes.number.isRequired,
    error: PropTypes.string,
  }),
  vcpus: PropTypes.shape({
    value: PropTypes.number.isRequired,
    error: PropTypes.string,
  }),
  emepheralStorage: PropTypes.shape({
    value: PropTypes.number.isRequired,
    error: PropTypes.string,
  }),
  ram: PropTypes.shape({
    value: PropTypes.number.isRequired,
    error: PropTypes.string,
  }),
  persistentStorage: PropTypes.shape({
    value: PropTypes.number.isRequired,
    error: PropTypes.string,
  }),
  supportLevel: PropTypes.string,
};

export default CostCalculations;
