import React from "react";
import { Row, Col } from "@canonical/react-components";

import TCO_VARIABLES from "../utils/variables";

const CostCalculations = (formState) => {
  //RAM
  const amountOfRamInCloud = formState.instances * formState.ram;

  const amountOfRamInFullyUtilizedCloud = Math.ceil(
    (amountOfRamInCloud * 100) /
      TCO_VARIABLES.ratios.desiredCloudUtilisationRatio
  );

  const requiredAmountOfRam = Math.ceil(
    amountOfRamInFullyUtilizedCloud /
      TCO_VARIABLES.ratios.ramOvercommitmentRatio
  );

  const requiredNumberCloudNodesBasedOnRam = Math.ceil(
    requiredAmountOfRam /
      (TCO_VARIABLES.storage.amountOfRamPerNode -
        TCO_VARIABLES.storage.reservedAmountOfRamPerNode)
  );

  //vCPUs
  const numberOfVcpusInCloud = formState.instances * formState.vcpus;

  const numberOfVcpusInFullyUtilizedCloud = Math.ceil(
    (numberOfVcpusInCloud * 100) /
      TCO_VARIABLES.ratios.desiredCloudUtilisationRatio
  );

  const requiredNumberOfVcpus = Math.ceil(
    numberOfVcpusInFullyUtilizedCloud /
      TCO_VARIABLES.ratios.cpuOvercommitmentRatio
  );

  const requiredNoOfCpus = Math.ceil(
    requiredNumberOfVcpus /
      (TCO_VARIABLES.counts.numberOfThreadsPerCpu -
        TCO_VARIABLES.counts.reservedNumberOfThreadsPerNode)
  );
  const requiredNumberCloudNodesBasedOnCpu = Math.ceil(
    requiredNoOfCpus / TCO_VARIABLES.counts.numberOfCpusPerNode
  );

  //Emepheral Storage
  const amountOfESInCloud = formState.instances * formState.emepheralStorage;

  const amountOfESInFullyUtilizedCloud = Math.ceil(
    (amountOfESInCloud * 100) /
      TCO_VARIABLES.ratios.desiredCloudUtilisationRatio
  );

  const requiredAmountOfES = amountOfESInFullyUtilizedCloud;

  const requiredNumberCloudNodesBasedOnES = Math.ceil(
    requiredAmountOfES /
      (TCO_VARIABLES.storage.amountOfEphemeralStoragePerNode * 1024 -
        TCO_VARIABLES.storage.reservedAmountOfEphemeralStoragePerNode)
  );

  //Persistent storage
  const amountOfPSInCloud = formState.instances * formState.persistentStorage;

  const amountOfPSInFullyUtilizedCloud = Math.ceil(
    (amountOfPSInCloud * 100) /
      TCO_VARIABLES.ratios.desiredCloudUtilisationRatio
  );

  const requiredAmountOfPS =
    amountOfPSInFullyUtilizedCloud *
    TCO_VARIABLES.ratios.persistentStorageReplicationFactor;

  let requiredNumberCloudNodesBasedOnPS;
  TCO_VARIABLES.storage.amountOfPersistentStoragePerNode > 0
    ? (requiredNumberCloudNodesBasedOnPS = Math.ceil(
        requiredAmountOfPS /
          1024 /
          TCO_VARIABLES.storage.amountOfPersistentStoragePerNode
      ))
    : (requiredNumberCloudNodesBasedOnPS =
        TCO_VARIABLES.storage.amountOfPersistentStoragePerNode);

  //total
  const requiredNumberOfCloudNodes = Math.max(
    requiredNumberCloudNodesBasedOnCpu,
    requiredNumberCloudNodesBasedOnRam,
    requiredNumberCloudNodesBasedOnES,
    requiredNumberCloudNodesBasedOnPS
  );

  const numberOfCloudNodes = Math.max(
    requiredNumberOfCloudNodes,
    TCO_VARIABLES.counts.minimumNumberOfCloudNodes
  );

  //counts
  const numberOfRacks = Math.ceil(
    Math.max(
      numberOfCloudNodes / TCO_VARIABLES.counts.maximumNumberOfCloudNodesInRack,
      TCO_VARIABLES.counts.minimumNumberOfRacks
    )
  );

  const numberOfRackControllerNodes =
    numberOfRacks * TCO_VARIABLES.counts.numberOfRackControllerNodesInRack;

  const numberOfSpineSwitches = Math.ceil(
    numberOfRacks / TCO_VARIABLES.counts.numberOfRacksPerSpineSwitch
  );

  const numberOfLeafSwitches =
    numberOfRacks * TCO_VARIABLES.counts.numberOfLeafSwitchesInRack;

  const numberOfManagementSwitches = Math.ceil(
    numberOfRacks / TCO_VARIABLES.counts.numberOfRacksPerManagementSwitch
  );

  const numberOfNodes =
    numberOfCloudNodes +
    TCO_VARIABLES.counts.numberOfInfraNodes +
    numberOfRackControllerNodes;

  //costs

  const calculatePriceOfNodes = (nodeCount, price) => {
    return nodeCount * price;
  };

  const cloudNodesCost = calculatePriceOfNodes(
    numberOfCloudNodes,
    TCO_VARIABLES.price.pricePerCloudNode
  );

  const infraNodesCost = calculatePriceOfNodes(
    TCO_VARIABLES.counts.numberOfInfraNodes,
    TCO_VARIABLES.price.pricePerInfraNode
  );

  const rackControllerNodesCost = calculatePriceOfNodes(
    numberOfRackControllerNodes,
    TCO_VARIABLES.price.pricePerRackController
  );

  const spineSwitchesCost = calculatePriceOfNodes(
    numberOfSpineSwitches,
    TCO_VARIABLES.price.pricePerSpineSwitch
  );

  const leafSwitchesCost = calculatePriceOfNodes(
    numberOfLeafSwitches,
    TCO_VARIABLES.price.pricePerLeafSwitch
  );

  const managementSwitchesCost = calculatePriceOfNodes(
    numberOfManagementSwitches,
    TCO_VARIABLES.price.pricePerManagementSwitch
  );

  const totalHardwareCost =
    cloudNodesCost +
    infraNodesCost +
    rackControllerNodesCost +
    spineSwitchesCost +
    leafSwitchesCost +
    managementSwitchesCost;

  const capExCost = totalHardwareCost + TCO_VARIABLES.price.deliveryCost;

  const totalInstallationAndMaintenanceCost =
    TCO_VARIABLES.price.annualPerNodeHardwareInstallationAndMaintenanceCost *
    numberOfNodes;

  const totalHostingRentElectricityCost =
    TCO_VARIABLES.price.annualPerNodeHostingRentAndElectricityCost *
    numberOfNodes;

  const totalHostingNetworkCost =
    2 *
    TCO_VARIABLES.price.annualPerGbpsHostingExternalNetworkCost *
    TCO_VARIABLES.operations.externalNetworkBandwidth;

  let totalSubscriptionCost;
  formState.supportLevel === "fully-managed"
    ? (totalSubscriptionCost =
        numberOfNodes * TCO_VARIABLES.operations.fullyManaged)
    : (totalSubscriptionCost =
        numberOfNodes * TCO_VARIABLES.operations.supported);

  const totalStaffSalaryCost =
    TCO_VARIABLES.operations.operationsTeamSize *
    TCO_VARIABLES.price.operationsTeamAvarageAnnualStaffSalary;

  let totalOperationsCost;
  formState.supportLevel === "fully-managed"
    ? (totalOperationsCost = totalSubscriptionCost)
    : (totalOperationsCost = totalSubscriptionCost + totalStaffSalaryCost);

  const opexCost =
    totalInstallationAndMaintenanceCost +
    totalHostingRentElectricityCost +
    totalHostingNetworkCost +
    totalOperationsCost +
    TCO_VARIABLES.price.annualLicenseCost;

  const charmedOpenstackTCO =
    capExCost + TCO_VARIABLES.operations.hardWareRenewalPeriod * opexCost;

  //Number of AWS EC2 VMs

  const calculateNumberOfAWSVMs = (numberInCloud, storage) => {
    return storage === 0 ? 0 : Math.floor(numberInCloud / storage);
  };

  const numberOfAWSEC2VMsBasedOnCPU = calculateNumberOfAWSVMs(
    numberOfVcpusInCloud,
    TCO_VARIABLES.storage.awsEc2InstanceVcpus
  );

  const numberOfAWSEC2VMsBasedOnRAM = calculateNumberOfAWSVMs(
    amountOfRamInCloud,
    TCO_VARIABLES.storage.awsEc2InstanceRam
  );

  const numberOfAWSEC2VMsBasedOnES = calculateNumberOfAWSVMs(
    amountOfESInCloud,
    TCO_VARIABLES.storage.awsEc2InstanceEmepheralStorage
  );

  const numberOfAWSEC2VMsBasedOnPS = calculateNumberOfAWSVMs(
    amountOfPSInCloud,
    TCO_VARIABLES.storage.awsEc2InstancePersistentStorage
  );

  const numberOfAWSEC2VMs = Math.max(
    numberOfAWSEC2VMsBasedOnCPU,
    numberOfAWSEC2VMsBasedOnRAM,
    numberOfAWSEC2VMsBasedOnES,
    numberOfAWSEC2VMsBasedOnPS
  );

  const AWSTCO = Math.floor(
    Math.floor(
      numberOfAWSEC2VMs *
        8760 *
        TCO_VARIABLES.price.AWSEC2T3aLargeHourlyInstanceCost
    ) * TCO_VARIABLES.operations.hardWareRenewalPeriod
  );

  //final calculations to display
  const hourlyCostPerInstance =
    charmedOpenstackTCO /
    formState.instances /
    (8760 * TCO_VARIABLES.operations.hardWareRenewalPeriod);

  const totalSavings =
    AWSTCO - charmedOpenstackTCO > 0 ? AWSTCO - charmedOpenstackTCO : 0;

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return (
    <>
      <div className="u-fixed-width">
        <hr className="p-separator" />
      </div>
      <Row>
        <Col size="10" className="u-align--right u-no-padding--right">
          <p className="p-heading--4">Hourly cost per instance:</p>
        </Col>
        <Col size="2" className="u-align--right">
          <p className="p-heading--4">${hourlyCostPerInstance.toFixed(4)}</p>
        </Col>
      </Row>
      <Row>
        <Col size="10" className="u-align--right u-no-padding--right">
          <p className="p-heading--4">
            Total savings compared to public clouds:
          </p>
        </Col>
        <Col size="2" className="u-align--right">
          <p className="p-heading--4">{formatter.format(totalSavings)}</p>
        </Col>
      </Row>
    </>
  );
};

export default CostCalculations;
