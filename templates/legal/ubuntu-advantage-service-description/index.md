---
wrapper_template: "legal/ubuntu-advantage-service-description/_base_legal_markdown.html"
context:
     title: "Ubuntu Advantage service description"
     description: "Detailed description and explanation of the benefits and services you receive as an Ubuntu Advantage customer."
markdown_includes:
     pricing_table: "shared/pricing/_ua-for-infrastructure.html"
---

# Ubuntu Advantage service description

**Valid since 2 December 2020**


<h2 id="uasd-ua-infrastructure">Ubuntu Advantage for Infrastructure (UA-I)</h2>

{{ pricing_table | safe }}

<div class="p-top"><a href="#" class="p-top__link">Back to top</a></div>


<h2 id="uasd-subscription">Subscriptions</h2>

As an Ubuntu Advantage for Infrastructure customer, you are entitled to the following benefits and services with respect to the [Nodes](#term-node) attached to your subscription.

When Ubuntu Advantage subscriptions are attached to all physical hosts in an Enviroment running a [Covered Hypervisor](#term-hypervisor), they cover the same services for all Ubuntu guests on that Enviroment.

1. Self-service customer care portal and knowledge base. Knowledge base access will be widely granted to all necessary personnel. A specific number of designated personnel will also be entitled to raise support issues.
2. Landscape Management. Landscape SAAS systems management is included with all support offerings, unless otherwise noted. RBAC for designated personnel will be under your control.
3. Kernel Livepatch Service
  1. The Kernel Livepatch Service includes a licence to use Canonical's kernel livepatch daemon, access to available kernel livepatches, and support for the service.
  2. The Kernel Livepatch Service provides security livepatches for selected High and Critical kernel CVEs. Some CVEs may be ineligible for livepatching due to technical limitations within the livepatching system or for other reasons.
  3. The Kernel Livepatch Service may provide kernel non-security bug fixes as kernel livepatches.
  4. Specific kernel versions are not guaranteed to receive livepatches indefinitely.  
  5. Only the default LTS kernel is available for livepatching. This includes  its backport as the last HWE kernel to the previous LTS release.
4. Extended Security Maintenance
  1. Extended Security Maintenance provides available High and Critical CVE fixes for a number of server packages. A complete list of packages included in Extended Security Maintenance for a given release can be found at: [wiki.ubuntu.com/SecurityTeam/ESM/](https://wiki.ubuntu.com/SecurityTeam/ESM/)
  2. Extended Security Maintenance is only included for 64-bit x86 AMD/Intel installations.
  3. Extended Security Maintenance does not provide:
    1. Bug fixes, unless a bug was created by an Extended Security Maintenance security update
    2. Security fixes for packages not found in the Maintained Packages list.
    3. Security fixes for CVEs that are not High or Critical
  4. Extended Security Maintenance does not guarantee secure software or fixes to all High or Critical CVEs.
5. FIPS-certified cryptographic modules
  1. Access to packages (when available) sufficient for compliance with the FIPS 140-2 Level 1 standard when used with Ubuntu on certain Intel x86\_64, IBM POWER8 and IBM Z hardware.
  2. Licences to such packages, to the extent not already licensed under open source software licences.
6. Common Criteria
  1. Access to packages and scripts (when available) sufficient for compliance with the Common Criteria EAL2 standard when used with Ubuntu on certain Intel x86\_64, IBM POWER8 and IBM Z hardware.
  2. Licences to such packages, to the extent not already licensed under open source software licences.
6. CIS Benchmark
  1. Access to packages (when available) sufficient for compliance with the Center for Internet Security (CIS) benchmark.
  2. Licenses to such packages, to the extent not already licensed under open source software licences.

<div class="p-top"><a href="#" class="p-top__link">Back to top</a></div>

<h2 id="uasd-support-levels">Support Levels</h2>

As an Ubuntu Advantage for Infrastructure Standard or Ubuntu Advantage for Infrastructure Advanced customer, you are entitled to all of the benefits and services described under the Subscriptions section above, and in addition are entitled to the following benefits and services:

1. 24x5 (Standard) or 24x7 (Advanced) phone and ticket support.
  1. Releases. Canonical will provide support for installation, configuration, maintenance, troubleshooting and usage of any standard release of Ubuntu when installed using official sources and within its product life cycle, including any applicable Extended Security Maintenance term. The life cycle for each version of Ubuntu is specified here: [ubuntu.com/about/release-cycle](https://ubuntu.com/about/release-cycle).
  2. Hardware. Ubuntu Certified hardware has passed Canonical's extensive testing and review process. More information about the Ubuntu certification process and a list of certified hardware can be found on the Ubuntu Certification page: [ubuntu.com/certified](https://ubuntu.com/certified) The services apply only with respect to customer's hardware which has been certified. In the event a customer requests the services with respect to hardware which is not certified, Canonical will use reasonable efforts to provide support services, but may not adhere to the obligations described in this service description.
  3. Packages. The service applies to:
    1. Packages found in the Ubuntu Main Repository, including the "proposed" and "backports" repository pockets
    2. Packages in the Ubuntu Cloud Archive
    3. Canonical maintained packages in the Universe Repository
    4. Canonical maintained Snap packages and [Charms](#term-charms)
    5. This service is not provided for any packages that have been modified from the supported version
  4. Kernels.
    1. The kernel provided initially in the release of a Long Term Support (LTS) version of Ubuntu is supported for the entire lifecycle of the LTS.
    2. Canonical releases Hardware enablement (HWE) kernels during the standard support period of an LTS version which provides support for newer hardware in an LTS releases. HWE kernels are supported until the next LTS point release.
    3. More information and details about kernel support can be found at [ubuntu.com/about/release-cycle](https://ubuntu.com/about/release-cycle)
    4. Access to Canonical Livepatch Service is included with all support offerings, unless otherwise noted.
  5. Landscape. All Landscape products, including Landscape on-premises (when purchased) are fully supported.
2. [OpenStack](#term-openstack) & [Kubernetes](#term-kubernetes) Support. Canonical will provide the support set out in the section below:
  1. Support for OpenStack
    1. OpenStack software support depends on the Ubuntu release deployed on the underlying [Nodes](#term-node):
        1. The version of OpenStack provided initially in the release of a Long Term Support (LTS) version of Ubuntu is supported for the entire lifecycle of that Ubuntu version.
        2. Releases of OpenStack released after an LTS version of Ubuntu are available in the Ubuntu Cloud Archive. Each OpenStack release in the Ubuntu Cloud Archive is supported on an Ubuntu LTS version for a minimum of 18 months from the release date of the Ubuntu version that included the applicable OpenStack version.
        3. Bug-fix support is provided only during LTS and is not offered during the ESM period.
        4. The OpenStack release support schedule is available here [ubuntu.com/about/release-cycle](/about/release-cycle)
    2. OpenStack support requires all Nodes that participate in the OpenStack Cloud  to be covered under an active support agreement.
    3. Full Stack support requirements:
        1. In addition to the requirements set out above, hardware must meet the minimum criteria for Charmed OpenStack.
        2. The OpenStack Cloud was deployed via a Private Cloud Build or was validated through a Cloud Validation engagement.
        3. Full Stack support includes:
          1. Support for the [Charms](#term-charms) deployed.
          2. For any deployments under contract with Canonical, which results in customisation of any Charms, customisation will be valid for 90 days after the official release of the Charm which includes the customisations.
          3. Support is included for all packages required to run OpenStack as deployed.
          4. [Upgrades](#term-upgrade) of OpenStack components as part of the regular Ubuntu LTS maintenance cycle.
          5. Upgrades between versions of OpenStack (for instance, from OpenStack Newton to Mitaka) or LTS versions of Ubuntu (for instance, from Ubuntu 14.04 LTS to Ubuntu 16.04 LTS), Juju and MAAS are supported as long as the upgrade is performed following a documented process as specified by Canonical as part of the Private Cloud Build or Cloud Validation Package.
          6. Addition of new cloud Nodes and replacement of existing Nodes with new Nodes of equivalent capacity are both supported.
          7. [Full Stack Support](#term-full-stack-support) excludes customisations which are not considered [Valid Customisations](#term-valid-customisations).
    4. OpenStack clouds not deployed through a Private OpenStack Build or validated using the Cloud Validation Package are limited to [Bug-fix Support](#term-bug-fix-support).
    5. Bug-fix support is provided only during LTS and is not offered during the ESM period.
    6. OpenStack support does not include support beyond Bug-fix Support during the deployment or configuration of an OpenStack cloud.
    7. [Charms](#term-charms):
        1. Each Charm version is supported for one year from the release date.
        2. Canonical will not provide support for any Charms that have been modified from the supported version found in the page at [wiki.ubuntu.com/OpenStack/OpenStackCharms](https://wiki.ubuntu.com/OpenStack/OpenStackCharms)
    8. Canonical will provide support for 72TB of raw storage per storage Node with Ceph or Swift storage exposed to the OpenStack cluster. This allowance can be used for Ceph, Swift, or a combination of these. Please note that only storage Nodes count towards the 72TB free tier of raw storage per Node.
    9. Ubuntu Advantage OpenStack includes a licence to use available Canonical provided Microsoft-certified drivers in Windows Guest instances.
    10. OpenStack support excludes:
        1. Support for workloads other than those required to run an OpenStack deployment.
        2. Support for guest instances other than [Cloud Guests](#term-cloud-guests).
  2. Support for Kubernetes
    1. Full Kubernetes Cluster support requirements:
        1. [Deployment](#term-deployment) of [Charmed Kubernetes](#term-cdk) in at least the minimum deployment configuration, or a kubeadm-deployed cluster of unmodified upstream Kubernetes binaries as published by the CNCF deployed on Ubuntu as base OS validated by Canonical.
        2. Highly-Available control plane either deployed using Charms in the Charmed Kubernetes reference architecture or in a similar fashion using kubeadm.
        3. Support must be purchased for all nodes in the supported Kubernetes cluster.
        4. Supported versions of Kubernetes include the current stable minor release and the two most recent minor releases in the stable release channel. Additional information can be found at: [ubuntu.com/kubernetes/docs/supported-versions](https://ubuntu.com/kubernetes/docs/supported-versions)
        5. For any deployment of Charmed Kubernetes carried out by Canonical while under contract for a deployment, which result in the customisation of any Charms, the customisation will be supported for 90 days after completion of the deployment.
    2. Unless Full-Stack Support requirements are met, support is limited to:
        1. The software packages and Charms necessary for running Charmed Kubernetes.
        2. Kubernetes clusters deployed using kubeadm utilising the software packages available from apt.kubernetes.io.
        3. Bug-fix support in the supplied software artefacts by Canonical during the Ubuntu LTS.
3. Ubuntu Legal Assurance programme. The customer is entitled to participate in the Ubuntu Assurance Programme, subject to its terms and conditions. Canonical may update the Assurance Programme and its terms periodically. The current Ubuntu Assurance Programme and its IP indemnification terms are available at Canonical's Ubuntu Assurance page: [ubuntu.com/legal/ubuntu-advantage/assurance](https://ubuntu.com/legal/ubuntu-advantage/assurance)

<div class="p-top"><a href="#" class="p-top__link">Back to top</a></div>

<h2 id="uasd-managed-services">Managed Services</h2>

1. Overview. Managed Services are an add-on to Ubuntu Advantage for Infrastructure Advanced. When added on, Canonical will manage the [Environment](#term-environment) as described below, and Guests running in the environment receive the Ubuntu Advantage for Infrastructure subscriptions and support. When the Environment is a [Cloud](#term-cloud), the Managed Services are referred to as "BootStack".
2. Service initiation. Following Canonical's building and initialising of the Environment (subject to separate service engagement), the Managed Service will re-deploy the Environment to reset credentials and validate the deployment process. The Managed Service will also provide documentation providing further detail on the working relationship with Canonical.
3. Operate. The Managed Service will remotely operate, monitor, and manage the Environment. Examples include: (i) backing up and restoring of the management infrastructure suite, (ii) hardware and software failure monitoring and alerting, and (iii) capacity and performance reporting.
  1. Patching and updates. The Managed Service will install applicable (e.g. security) patches and updates from the Ubuntu Cloud Archive to:
    1. The Ubuntu operating system.
    2. OpenStack or Kubernetes and its dependencies.
    3. OpenStack or Kubernetes Charms.
    4. Other software deployed as part of the Environment.
  2. Administrative access. The Managed Service will provide the customer with access to the following applications and/or services:
    1. The OpenStack or Kubernetes dashboard, API and CLI.
    2. Landscape (restricted to read only access).
    3. Monitoring and logging system (restricted to read only access).
    4. Only Canonical will have login access to Environment Nodes.
  3. Environment size. The Managed Service will add or remove Nodes from the Environment as requested by the customer through a support ticket, provided that the Environment does not go under the [Minimum Size Requirement](#term-min-size). All Environment Nodes must be covered under the service, so additional fees may apply.
  4. Ubuntu, OpenStack and Kubernetes upgrades. The Managed Service will ensure the customer's Environment remains on a supported LTS version of Ubuntu and OpenStack and/or Kubernetes.
  5. Project work. The Managed Service will provide planned upgrades and maintenance Monday to Friday during Canonical working days.
4. Out of scope. The Managed Service does not provide:
  1. Relating to [Guest Instances](#term-guest-instance) or Container Instances:
    1. Managing the operating system or applications running within Guest Instances or Container Instances.
    2. Monitoring of Guest Instances or Container Instances.
    3. Backup or recovery of customer generated data (e.g. any applications or databases running) within Guest Instances or Container Instances.
    4. Support for the ability to run Guest Instances using images other than those provided by Canonical.
  2. Architectural changes to the Environment.
  3. Alternative scheduling of updates or upgrades.
  4. Installation of packages or software other than those in the applicable Ubuntu Main Repository or updates to those packages delivered in the Ubuntu Cloud Archive.
  5. Supported version of Ubuntu, OpenStack or Kubernetes must be within the 5 year 'general' release window.
  6. Installation of additional components (e.g. LBaaS, VPNaaS, SDN or SDS) beyond the software installed as part of the building of the Environment.
5. Service conclusion. At the end of the service term, the Managed Service will initiate an operational transfer. Operational transfer includes:
  1. hand over of all credentials of the hosts and management software to the customer.
  2. hand over of the administrative credentials of Landscape (The continued operation of Landscape is subject to purchase and agreement of appropriate license terms.)
  3. coordination of any applicable training (if purchased).
6. Customer dependencies. The Managed Service requires:
  1. continuous VPN access for Canonical support personnel to the Environment;
  2. utilisation parameters per Node to be kept below the maximum specified in the design document provided by Canonical when the Environment is delivered to the customer;
  3. the facility where the Environment is hosted to comply with the minimum required measures to function, including but not limited to, connectivity, sufficient power supply, sufficient cooling system, and physical access control to the environment; and
  4. that the [Minimum Size Requirement](#term-min-size) for the [Cloud](#term-cloud) or [Cluster](#term-cluster) is maintained at all times.
7. Uptime Service Level
  1. The Managed Service includes the following uptime service levels:<br />
|        | Data plane for customer workloads which are distributed across two regions | Data plane for customer workloads which are in a single region | Control plane (OpenStack/Kubernetes API, Web UI and CLI) |
| ------ | --------------------------------------------------------------------------:| --------------------------------------------------------------:| --------------------------------------------------------:|
| Uptime |                                                                      99.9% |                                                          99.5% |                                                      99% |
  2. Data plane includes:
    1. Virtualisation (for workloads which are architected to not depend on a single compute node).
    2. Storage (Block & Object).
    3. Network for instances.
  3. Downtime must be directly attributable to Canonical in order for it to count against the service level and is measured across a 12 month period. Planned maintenance windows and any requests by the customer are not taken into account when calculating uptime. Planned maintenance is carried out as required by Canonical, Monday to Friday during Canonical working days.

<div class="p-top"><a href="#" class="p-top__link">Back to top</a></div>


<h2 id="uasd-virtual-machines">Virtual Machines and Cloud Instances</h2>

1. The Ubuntu Advantage for Infrastructure, Virtual services match those of the applicable Ubuntu Advantage for Infrastructure offering, subject to the exceptions listed below.
2. The Ubuntu Advantage Infrastructure, Virtual services are provided for Ubuntu Server when installed and running as a guest in a virtualised environment either (1) in an Ubuntu Certified Public Cloud partner's environment, or (2) on a physical host, provided the guest is running on a [Covered Hypervisor](#term-hypervisor).<br /><br />
Note: Only underlying technology is listed. These can be provided via a cloud like OpenStack. If hypervisor vendor provides a specific list of supported Ubuntu versions only those will be eligible for Ubuntu Advantage for Infrastructure, Virtual service.<br /><br />
4. Certified Public Cloud partners can be found in the Ubuntu partner listing: [ubuntu.com/public-cloud](https://ubuntu.com/public-cloud)
5. Kubernetes support is included as per definitions in the application section of Ubuntu Advantage for Infrastructure above.
6. The Ubuntu Advantage for Infrastructure, Virtual service does not provide:
  1. Hypervisor support.
  2. OpenStack support.
  3. MAAS support.
  4. Providing native images for a chosen hypervisor.
  5. Additional exclusions match those of the applicable Ubuntu Advantage for Infrastructure service offering.

<div class="p-top"><a href="#" class="p-top__link">Back to top</a></div>

<h2 id="uasd-desktop-support">Desktop support</h2>

1. Desktop support services are subject to the exceptions listed below.
2. Scope. Desktop support covers all packages in the base Ubuntu desktop image and packages necessary for basic network authentication and connectivity using sssd, winbind, network-manager, and network-manager plugins in the Ubuntu Main repository. It also covers Ubuntu distribution for Windows Subsystem for Linux (WSL).
3. Out of scope.
  1. Dual-booting (cohabitating with other operating systems).
  2. Peripherals which are not certified to work with Ubuntu.
  3. Community flavours of Ubuntu.
  4. Support for architectures other than x86_64.


<div class="p-top"><a href="#" class="p-top__link">Back to top</a></div>

<h2 id="uasd-add-ons">Add-Ons</h2>

Add-Ons constitute additional support services available separately on a per-Node basis and require the underlying Node to be covered by a suitable Ubuntu Advantage support contract.

1. [Trilio](#term-trilio) Support
  1. Requirement: Node needs to be covered by UA for Infrastructure.
  2. Trilio Support provide break-fix support for, and answering basic questions about, using Trilio in accordance with the compatibility matrix and support lifecycle published by Trilio Data, Inc.
  3. Trilio Support does not provide:
    1. Migration of workloads between Trilio versions.
    2. Support for, or answering questions about, third party add-ons to Trilio.
    3. Installation of Trilio.
2. Storage Support
  1. Ubuntu Advantage for Infrastructure includes an allowance for usable storage on a per-Node basis. See the "OpenStack & Kubernetes Support" section.
  2. If the Node allowance is exceeded, additional Storage Support needs to be acquired.
  3. Storage Support is provided at the corresponding response times.
  4. Storage Support is measured by the total amount of data stored across all storage pools, measured in gigabytes. This excludes free space and all replication and erasure coding overhead.
  5. Storage Support applies to support for Ceph and Swift.
  6. Customers who have purchased Storage Support for an unlimited amount of storage are limited to support in a single [Ceph Cluster](#term-ceph-cluster) or [Swift Cluster](#term-swift-cluster).

<div class="p-top"><a href="#" class="p-top__link">Back to top</a></div>

<h2 id="uasd-maas-support">MAAS Support</h2>

1. Support eligibility. In order to be eligible for MAAS support, all nodes connected to a MAAS region controller need to be covered under a MAAS support agreement or an Ubuntu Advantage for Infrastructure agreement (Standard or Advanced).
  1. UA-I includes support for MAAS.
  2. MAAS needs to be purchased for all nodes not covered under UA-I to remain eligible for MAAS support.
2. Included support. MAAS provides:
  1. Support for the ability to boot machines using operating system images provided by Canonical.
  2. Support for the tooling required to convert certified operating system images not provided by Canonical into MAAS images.
  3. Licence to use MAAS Image Builder.
3. Out of scope. MAAS does not provide:
  1. Support for workloads, packages and service components other than those required to run a MAAS deployment.
  2. Support for the nodes deployed using MAAS.
  3. Support for design and implementation details of a MAAS deployment.
  4. Access to Landscape and Canonical Livepatch Service for machines deployed with MAAS.
4. Versions. Versions of MAAS are supported on an LTS version of Ubuntu for a period of one year from the date it is released in the Ubuntu archives.

<div class="p-top"><a href="#" class="p-top__link">Back to top</a></div>

<h2 id="uasd-software">Software</h2>

1. [Landscape on Premises](#term-landscape-on-premises)
  1. Landscape on Premises support is included in Ubuntu Advantage for Infrastructure.
  2. The Landscape on Premises service provides:
    1. Licence to download and install a single instance of Landscape on Premises.
    2. Ability to use Landscape on-premises management and monitoring services for machines (whether physical or virtual) for which the customer has purchased Ubuntu Advantage services.
    3. [Deployment](#term-deployment) methods:
        1. When installed using the "Quickstart" install method, support is included for the machine on which Landscape on Premises is installed.
        2. When installed using a manual install method, support is included for up to two servers on which Landscape on Premises is installed.
        3. When deployed using Juju, the "dense deployment" method will be supported.
2. [Livepatch on Premises](#term-livepatch-on-premises)
  1. Livepatch on Premises support is included in Ubuntu Advantage for Infrastructure.
  2. The service provides a licence to download and install a single instance of Livepatch on Premises.

<div class="p-top"><a href="#" class="p-top__link">Back to top</a></div>

<h2 id="uasd-professional-support">Professional Support Services</h2>

1. Technical Account Manager ([TAM](#term-tam))
  1. Canonical will enhance its support offering by providing a TAM, who will perform the following services for up to 10 hours per week during the term of service:
    1. Provide support and best-practice advice on platform and configurations covered by the applicable Ubuntu Advantage services.
    2. Participate in review calls every other week at mutually agreed times addressing the customer's operational issues.
    3. Organise multi-vendor issue coordination through TSANet or Canonical's direct partnerships where applicable. When the root cause is identified, the TAM will work with the vendor for that sub-system, working to resolve the case through their normal support process.
  2. Canonical will hold a quarterly service review meeting with the customer to assess service performance and determine areas of improvement.
  3. The TAM will visit the customer's site annually for on-site technical review.
  4. The TAM is available to respond to support cases during the TAM's working hours. Outside of such hours, support will be provided per the Ubuntu Advantage Support Process.
2. Dedicated Technical Account Manager ([DTAM](#term-dtam))
  1. Canonical will enhance its support offering by providing a DTAM, who will perform the following services during local Business Hours for up to 40 hours per week (subject to Canonical leave policies) during the term of service:
    1. Provide support and best-practice advice on platform and configurations covered by the applicable Ubuntu Advantage services.
    2. Act as the primary point of contact for all support requests originating from the customer department for which the DTAM is responsible.
    3. Manage support escalations and prioritisation in accordance with Canonical's standard support response definitions and customer needs.
    4. Participate in regular review calls addressing the customer's operational issues.
    5. Organise multi-vendor issue coordination through TSANet or Canonical's direct partnerships where applicable. When the root cause is identified, the DTAM will work with the vendor for that sub-system, working to resolve the case through their normal support process.
    6. Attend applicable Canonical internal training and development activities (in-person and remote).
  2. Canonical will hold a quarterly service review meeting with the customer to assess service performance and determine areas of improvement.
  3. The DTAM is available to respond to support cases during the DTAM's working hours. Outside of Business Hours, support will be provided per the Ubuntu Advantage Support Process.
  4. If a DTAM is on leave for longer than five consecutive business days, Canonical will assign a temporary remote resource to cover the leave period. Canonical will coordinate with the customer with respect to foreseeable DTAM leave.
3. Dedicated Support Engineer ([DSE](#term-dse))
  1. Canonical will enhance its support offering by providing a DSE, who will perform the following services during local Business Hours for up to 40 hours per week (subject to Canonical leave policies) during the term of service:
    1. Be available onsite as required to meet the customer's requirements.
    2. Understand the products utilised in the customer's environment that need to be integrated with Canonical's offerings and assist with those products, to the extent reasonable based on the DSE's expertise, to ensure the successful usage of offerings from Canonical.
    3. Provide support and best-practice advice on platform and configurations covered by the applicable Ubuntu Advantage services.
    4. Act as the primary point of contact for all support requests originating from the customer department for which the DSE is responsible.
    5. Manage support escalations and prioritization in accordance with Canonical's standard support response definitions and customer needs.
    6. Participate in regular review calls addressing the customer's operational issues.
    7. Organise multi-vendor issue coordination through TSANet or Canonical's direct partnerships where applicable. When the root cause is identified, the DSE will work with the vendor for that sub-system, working to resolve the case through their normal support process.
    8. Attend applicable Canonical internal training and development activities (in-person and remote).
  2. Canonical will hold a quarterly service review meeting with the customer to assess service performance and determine areas of improvement.
  3. The DSE is available to respond to support cases during the DSE's working hours. Outside of Business Hours, support will be provided per the Ubuntu Advantage Support Process.
  4. If a DSE is on leave for longer than five consecutive business days, Canonical will assign a temporary remote resource to cover the leave period. Canonical will coordinate with the customer with respect to foreseeable DSE leave.

<div class="p-top"><a href="#" class="p-top__link">Back to top</a></div>

<h2 id="uasd-ua-support-services">Ubuntu Advantage Support Services Process</h2>

1. Service initiation
  1. Upon commencement of the services, Canonical will provide access for a single technical representative to Landscape, the support portal, and the online knowledge base.
  2. The customer, through their initial technical representative, may select their chosen technical representatives to interface with Canonical based on the number of systems under support as represented in the table below. These technical representatives will hold credentials to the support portal and will act as primary points of contact for support requests.<br /><br />
  |Number of nodes under Ubuntu Advantage support|Technical representatives|
  |----:|----:|
  |1-20|2|
  |21-50|3|
  |51-250|6|
  |251-1000|9|
  |1001-5000|12|
  |5001+|15|
  <br />
  3. The customer may change their specified technical representatives at any time by submitting a support request via the support portal.
2. Submitting support requests
  1. The customer may open a support request once the customer account has been provisioned within the support portal.
  2. The customer may submit support cases through the support portal or by contacting the support team by telephone, unless otherwise noted.
  3. A support case should consist of a single discrete problem, issue, or request.
  4. Cases are assigned a ticket number and responded to automatically. All correspondence not entered directly into the case, including emails and telephone calls, will be logged into the case with a timestamp for quality assurance.
  5. When reporting a case, the customer should provide an impact statement to help Canonical determine the appropriate severity level. Customers with multiple concurrent support cases may be asked to prioritize cases according to severity of business impact.
  6. The customer is expected to provide all information requested by Canonical as we work to resolve the case.
  7. Canonical will keep a record of each case within the support portal enabling the customer to track and respond to all current cases and allowing for review of historical cases.
3. Support severity levels
  1. Once a support request is opened, a Canonical Support Engineer will validate the case information and determine the severity level, working with the customer to assess the urgency of the case.
  2. Response times will be as set forth in the Service Description for the applicable service offering.
  3. When setting the severity level, Canonical's Support Team will use the definitions as stated below.
  4. Canonical will work during the applicable Business Hours to provide the customer with a work-around or permanent solution.
  | | |
  |--|--|
  |**Severity Level 1**<br />Core functionality critical impact/<br />Service down|Canonical will use continuous effort according to the service level purchased, through appropriate support engineer(s) and/or development engineer(s), to provide a work-around or permanent solution. As soon as core functionality is available, the severity level will be lowered to the new appropriate severity level. Continuous effort support is dependent on the customer being available at all times to assist Canonical, otherwise Canonical may need to reduce the severity level and its ability to respond.
  |**Severity Level 2**<br />Core functionality severely degraded|As soon as core functionality is no longer severely degraded, the severity level will be lowered to level 3.|
  |**Severity Level 3**<br />Standard support request|As soon as possible, balanced against higher severity level cases. If a work-around is provided, Canonical's support engineers will continue to work on developing a permanent resolution to the case.|
  |**Severity Level 4**<br />Non-urgent request, including informational requests, feature requests and similar matters. |Canonical will review each level 4 case and determine whether it is a product enhancement to be considered for a future release, an issue to be fixed in the current release or an issue to be fixed in a future release. Canonical will review and respond to information requests with a reasonable level of effort during coverage hours. Canonical may close cases representing level 4 issues after responding if Canonical believes it is appropriate to do so. Canonical does not provide a timeline or guarantee for inclusion of any feature requests.|
4. Response times. Canonical will use reasonable efforts to respond to support requests made by the customer within the initial response times set forth below, based on the applicable service and severity level.
  1. Table of initial response times
|                      | Standard                                 | Advanced |
| -------------------- | ---------------------------------------- | -------- |
| **Severity Level 1** | 4 hours, excluding weekends and holidays | 1 hour   |
| **Severity Level 2** | 8 Business Hours                         | 2 hours  |
| **Severity Level 3** | 12 Business Hours                        | 6 hours  |
| **Severity Level 4** | 24 Business Hours                        | 12 hours |
  2. Resolution. Canonical will use reasonable efforts to resolve support cases, but Canonical does not guarantee a work-around, resolution or resolution time.
5. Hotfixes. To temporarily resolve critical support cases, Canonical may provide a version of the affected software (e.g. package) that applies a patch. Such versions are referred to as "hotfixes". Hotfixes provided by Canonical are supported for 90 days after the corresponding patch has been incorporated into a release of the software in the Ubuntu Archives. However, if a patch is rejected by the applicable upstream project, the hotfix will no longer be supported and the case will remain open.
6. Languages. Canonical will provide support in English. Other languages may be available at certain times.
7. Remote sessions. Canonical may offer to access the customer's supported system using a remote access service. In such case, Canonical will determine which remote access service to use.
8. Ubuntu Advantage Management Escalation. In the event of an unsatisfactory service of any kind, there are several ways to escalate this situation to Canonical management.
9. Feedback at end of case. When a case is closed, a survey will be emailed to the case owner concerning overall experience with Canonical's support. All surveys are reviewed by management.
10. Ask for a Peer Review. As a normal business practice, Canonical performs peer reviews on a percentage of all cases. Customers can specifically request a peer review on a case within the case comments or by calling the phone number listed in the support portal. An impartial engineer will be assigned to review the case and provide feedback.
11. Management escalation. The customer may escalate support issues following the escalation process:
  1. Non-urgent needs. Request a management escalation within the case itself. A manager will be contacted to review the case and post a response within 1 business day.
  2. Urgent needs.
      1. Escalate to Canonical's Support & Technical Services Manager by emailing [support-manager@canonical.com](mailto:support-manager@canonical.com).
      2. If you require further escalation, email Canonical's Support & Technical Services Director at [operations-director@canonical.com](mailto:operations-director@canonical.com).


<div class="p-top"><a href="#" class="p-top__link">Back to top</a></div>

<h2 id="uasd-definitions">Definitions</h2>

- <strong id="term-bug-fix-support">Bug-fix Support</strong> means support for valid code bugs in Supported Packages only. This does not include troubleshooting of issues to determine if a bug is present.
- <strong>Business hours</strong> means 08:00 - 18:00 Monday - Friday local to the customer's headquarters unless another location is agreed. All times exclude public holidays.
- <strong id="term-ceph-cluster">Ceph Cluster</strong> means a single Ceph installation in a single physical data centre and specified by a unique identifier.
- <strong id="term-charms">Charm</strong> means a set of scripts compatible with Juju application modelling for the purpose of deploying and configuring relationships between software packages .
- <strong id="term-cdk">Charmed Distribution of Kubernetes</strong> means Kubernetes deployed using Juju and the official Canonical-Kubernetes bundle on bare metal, cloud guests, or virtual machines.
- <strong id="term-cloud">Cloud</strong> means the deployment of the OpenStack cloud computing environment.
- <strong id="term-cloud-guests">Cloud Guest</strong> means a Guest Instance or Container Instance of Ubuntu Server the cloud as defined above.
- <strong id="term-cluster">Cluster</strong> means the deployment of the Kubernetes computing environment to be managed by Canonical.
- <strong id="term-container-instance">Container Instance</strong> means a container instance running in the Cluster.
- <strong id="term-hypervisor">Covered Hypervisor</strong> means any of: KVM | Qemu | Bochs, VMWare ESXi, LXD | LXC, Xen, Hyper-V, VirtualBox, z/VM, Docker.
- <strong id="term-deployment">Deployment</strong> means the process of deploying Charmed Kubernetes or Kubernetes using kubeadm. A deployment is considered successful once Juju reports all applications in a "started" state.
- <strong id="term-dse">DSE</strong> means a Canonical dedicated support engineer dedicated to work full-time for a single customer acting as an extension of the customer's support organization with a primary focus on integrating and supporting Canonicals offerings within the customer's environment.
- <strong id="term-dtam">DTAM</strong> means a Canonical support engineer dedicated to work full-time remotely for a single customer.
- <strong id="term-environment">Environment</strong> means a Cloud or Cluster, as applicable to the particular service offering.
- <strong id="term-full-stack-support">Full Stack Support</strong> means addressing problems pertaining to user and operations-level OpenStack or Kubernetes functionality, performance and availability.
- <strong id="term-guest-instance">Guest Instance</strong> means a virtual machine instance running in the Cloud.
- <strong>Infrastructure Services</strong> refers to the services used by Canonical to deploy, manage, monitor and maintain the Environment.  It includes MAAS, Landscape and LMA Services.
- <strong id="term-kubernetes">Kubernetes</strong> means the container orchestration software known as "Kubernetes" as distributed by Canonical.
- <strong id="term-landscape-on-premises">Landscape on Premises</strong> means Canonical's Landscape system management software installed on the customer's hardware.
- <strong id="term-livepatch-on-premises">Livepatch on Premises</strong> means Canonical's livepatch repository software installed on the customer's hardware.
- <strong>LMA Services</strong> means Logging, Monitoring and Aggregation services and currently includes: Nagios, Prometheus, Alertmanager,  Grafana, Graylog and Elasticsearch.
- <strong>Managed Node</strong> means any Node which either runs Infrastructure Services or is managed by the Juju controller run by Canonical and considered alive by Juju.
- <strong id="term-min-size">Minimum Size Requirement</strong> means at least 12 host Nodes continuously available for the Cloud or 10 host Nodes continuously available for the Cluster or such other size requirement as agreed with Canonical in writing.
- <strong id="term-node">Node</strong> means a Physical Node or Virtual Machine provided to Canonical (or paid for) by the Customer for the purposes of running the Environment.  Any further machines (whether virtual or container) created on top of a Node are not themselves considered to be Nodes.
- <strong id="term-openstack">OpenStack</strong> means the cloud computing software known as "OpenStack" as distributed by Canonical with Ubuntu.
- <strong id="term-openstack-packages">OpenStack Packages</strong> means packages relevant to OpenStack present in the Ubuntu Main repository of the Ubuntu Archive, including updates to those packages delivered in the Ubuntu Cloud Archive.
This includes Charms listed at [wiki.ubuntu.com/OpenStack/OpenStackCharms](https://wiki.ubuntu.com/OpenStack/OpenStackCharms).
- <strong>Physical Node</strong> means a single named/managed unit of physical compute infrastructure, essentially the shelf or rack unit. May contain multiple CPU sockets, cores, NICs, Storage controllers/devices.
- <strong>Public Cloud</strong> means an Environment in which third parties (i.e. beyond just Canonical and the customer) are able to create and manage Guest or Container Instances.  
- <strong>Region</strong> means a discrete OpenStack environment with dedicated API endpoints that typically shares only the Identity (Keystone) service with other Regions. An OpenStack Region must be contained within a single datacentre.
- <strong>Support</strong> means break-fix support and answering basic questions about Supported Packages. Deployment and Upgrade assistance, as well as configuration and optimization of Kubernetes fall outside the scope of support.
- <strong>Supported Kubernetes Packages</strong> means packages containing the binary form of Kubernetes as distributed by Canonical or the CNCF via a suitable package repository.
- <strong id="term-supported-packages">Supported Packages</strong> means the combination of OpenStack Packages above and Kubernetes Packages.
- <strong id="term-swift-cluster">Swift Cluster</strong> means a single Swift installation in a single physical data centre and specified by a unique identifier.
- <strong id="term-tam">TAM</strong> means a Canonical support engineer who works remotely to personally collaborate with the customer's staff and management.
- <strong id="term-trilio">Trilio</strong> means the software known as Trilio as published by Trilio Data, Inc.
- <strong id="term-upgrade">Upgrade</strong> means the process of upgrading Kubernetes between versions. An upgrade is considered successful once Juju reports all applications in a "started" state. Canonical will provide support for valid bugs encountered during the Upgrade process.
- <strong id="term-valid-customisations">Valid Customisations</strong> means configurations made through Horizon or the OpenStack API of the OpenStack Packages. For the avoidance of doubt, valid customizations do not include architectural changes that are not expressly executed or authorized by Canonical. Configuration options set during Private Cloud Build should be considered critical to the health of the Cloud. Any changes to these may render the cloud unsupported. Request for changes should be validated by Canonical to ensure continued support.
- <strong id="term-virtual-machine">Virtual Machine</strong> means a virtualized compute instance instantiated on a recognised hypervisor technology (KVM, VMWare ESXi, Openstack or Public Cloud).

<div class="p-top"><a href="#" class="p-top__link">Back to top</a></div>
