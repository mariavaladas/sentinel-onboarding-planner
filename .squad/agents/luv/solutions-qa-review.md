# Solutions.json QA Review

## Summary
- 488 connectors reviewed
- 269 issues found (3 critical, 263 moderate, 3 minor)
- Review method: family-level setup templates were cross-checked against Microsoft official guidance for Azure diagnostics, Windows/AMA connectors, Syslog/CEF via AMA, Entra ID, Microsoft 365, Defender XDR, AWS, and Azure DevOps Auditing.
- Focus: only planning-impacting inaccuracies that could mislead onboarding effort, ownership, or prerequisite sequencing.

## Findings by Connector

### 1 Password
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### 42 Crunch API Protection
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Abnormal Security
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Abuse IPDB
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Acronis Cyber Protect Cloud
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Agari
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Agent 365
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Agile Sec Analytics Connector
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### AI Analyst Darktrace
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### AI Shield AI Security Monitoring
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Akamai Security Events
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### ALC-Web CTRL
#### ✅ Correct
- Host-based AMA + DCR collection is the right base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc rights for non-Azure hosts. | Add Monitoring Contributor and note Azure Connected Machine permissions when targets are outside Azure. |

### Alibaba Cloud
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Alibaba Cloud Action Trail
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Alibaba Cloud Networking
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Alsid For AD
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Amazon Web Services
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though source-cloud export connectors require source-platform IAM/service permissions plus Sentinel workspace access. | Capture both the Azure workspace role and the source-platform IAM/service-account prerequisite. |
| 2 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Amazon Web Services Network Firewall
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Amazon Web Services Route 53
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Anvilogic
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Apache HTTP Server
#### ✅ Correct
- Host-based AMA + DCR collection is the right base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc rights for non-Azure hosts. | Add Monitoring Contributor and note Azure Connected Machine permissions when targets are outside Azure. |

### Apache Log4j Vulnerability Detection
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### ARGOS Cloud Security
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Arista Awake Security
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Armis
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Armorblox
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Aruba Clear Pass
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Atlassian Confluence Audit
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Atlassian Jira Audit
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Attacker Tools Threat Protection Essentials
#### ✅ Correct
- Host-based AMA + DCR collection is the right base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc rights for non-Azure hosts. | Add Monitoring Contributor and note Azure Connected Machine permissions when targets are outside Azure. |

### Australian Cyber Security Centre
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Auth0
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Authomize
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### AWS Access Logs
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### AWS Athena
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### AWS Cloud Front
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### AWS EKS
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### AWS ELB
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### AWS IAM
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### AWS Security Hub
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### AWS Systems Manager
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### AWS VPC Flow Logs
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Azure Activity
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Batch Account
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Cloud NGFW By Palo Alto Networks
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Cognitive Search
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure DDoS Protection
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure DevOps Auditing
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Completeness | Moderate | Official setup requires Azure DevOps auditing to be enabled at the organization level, but the task list never calls that prerequisite out. | Add an explicit prerequisite/task to enable and verify Azure DevOps auditing before ingestion work starts. |
| 2 | Infrastructure | Moderate | The entry treats Event Hub + Logic App + parser as mandatory, but current Microsoft content also supports direct / codeless log-ingestion patterns. | Reword the infrastructure as an implementation option, not a universal requirement, and prefer the current connector path by default. |

### Azure Event Hubs
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Firewall
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Key Vault
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Kubernetes Service
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Logic Apps
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Network Security Groups
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Resource Graph
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Security Benchmark
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Service Bus
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure SQL Database Solution for Sentinel
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Storage
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Stream Analytics
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Azure Web Application Firewall (WAF)
#### ✅ Correct
- Diagnostic-settings-based Azure resource onboarding is the right overall model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Reader + Microsoft Sentinel Contributor is not enough to configure the required diagnostic settings / log-export path on the source Azure scope. | Use Contributor or Monitoring Contributor / Log Analytics Contributor (or equivalent) on the source resource/subscription, plus Microsoft Sentinel Contributor on the workspace. |

### Barracuda Cloud Gen Firewall
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Barracuda WAF
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### BETTER Mobile Threat Defense (MTD)
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Beyond Security be SECURE
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Beyond Trust PM Cloud
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Big ID
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Bit Sight
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Bitglass
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Bitwarden
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Blackberry Cylance PROTECT
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Blacklens
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Blink Ops
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Blood Hound Enterprise
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Box
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Broadcom Symantec DLP
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Business Email Compromise - Financial Fraud
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Censys
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Check Phish by Bolster
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Check Point
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Check Point Cloud Guard CNAPP
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Check Point Cyberint Alerts
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Check Point Cyberint IOC
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cisco ACI
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Cisco ASA
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Cisco Duo Security
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Cisco ETD
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Cisco Firepower E Streamer
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### Cisco ISE
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Cisco Meraki Events via REST API
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cisco SD-WAN
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Cisco Secure Cloud Analytics
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Cisco Secure Endpoint
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cisco SEG
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Cisco UCS
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Cisco Umbrella
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though source-cloud export connectors require source-platform IAM/service permissions plus Sentinel workspace access. | Capture both the Azure workspace role and the source-platform IAM/service-account prerequisite. |
| 2 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Cisco WSA
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Citrix ADC
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Citrix Analytics CCF
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Citrix Analytics for Security
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Citrix Web App Firewall
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Claroty
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Claroty x Dome
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cloud Identity Threat Protection Essentials
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Cloud Service Threat Protection Essentials
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Cloudflare
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Cloudflare CCF
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cofense Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cofense Triage
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cognni
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cognyte Luminar
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cohesity Security
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Common Event Format
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Accuracy | Minor | Validation is generic even though the official connector output is well-defined for this connector family. | Call out CommonSecurityLog explicitly in validation/testing steps. |
| 2 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### Commvault Security IQ
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Continuous Diagnostics&Mitigation
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Contrast ADR
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Contrast Protect
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### Corelight
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cortex XDR
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### Cribl
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Crowd Strike Falcon Endpoint Protection
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### CTERA
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyber Ark Privilege Access Manager (PAM) Events
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Cybersecurity Maturity Model Certification(CMMC)2.0
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cybersixgill-Actionable-Alerts
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyble Vision
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyborg Security HUNTER
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyera DSPM
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyfirma Attack Surface
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyfirma Brand Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyfirma Compromised Accounts
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyfirma Cyber Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyfirma Digital Risk
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyfirma Vulnerabilities Intel
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyjax
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cynerio
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyren Threat Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyren-Crowd Strike-Threat Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyren-Sentinel One-Threat Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Cyware
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### D3 Smart SOAR
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Darktrace
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Databahn
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Datalake2 Sentinel
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Dataminr Pulse
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Datawiza
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Delinea Secret Server
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### Dev 0270 Detection and Hunting
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### DEV-0537 Detectionand Hunting
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Digital Guardian Data Loss Prevention
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Digital Shadows
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### DNS Essentials
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Domain Tools
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Doppel
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### DORA Compliance
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### DPDP Compliance
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Dragos
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Druva Data Security Cloud
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Dynamics 365
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Dynatrace
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Eaton Foreseer
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Eclectic IQ
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Egress Defend
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Elastic Agent
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Elastic Search
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Endace
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Endpoint Threat Protection Essentials
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Entrust identity as Service
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Ermes Browser Security
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### ESET Inspect
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### ESET Protect Platform
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Eset Security Management Center
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### ESETPROTECT
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Exabeam Advanced Analytics
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Extra Hop
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Extra Hop Reveal(x)
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though source-cloud export connectors require source-platform IAM/service permissions plus Sentinel workspace access. | Capture both the Azure workspace role and the source-platform IAM/service-account prerequisite. |
| 2 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### F5 Big-IP
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### F5 Networks
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### Falcon Friday
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Feedly
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Fire Eye Network Security
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Flare
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Forcepoint CASB
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Forcepoint CSG
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Forcepoint DLP
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Forcepoint NGFW
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Forescout (Legacy)
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Accuracy | Moderate | This solution is explicitly legacy, but the planner entry does not warn customers that they should evaluate the current supported Forescout offering first. | Flag the connector as legacy/superseded and direct planning toward the current supported Forescout content-hub solution where possible. |
| 2 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Forescout eye Inspect for OT Security
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Forescout Host Property Monitor
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Forge Rock Common Audit for CEF
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Fortinet Forti Gate Next-Generation Firewall connector for Microsoft Sentinel
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Fortinet Forti NDR Cloud
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Fortinet Forti Web Cloud WAF-as-a-Service connector for Microsoft Sentinel
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Garrison ULTRA
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### GDPR Compliance & Data Security
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Gigamon Connector
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### GitLab
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Global Secure Access
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Security Reader is view-only; official setup for Entra / Defender streaming requires Security Administrator or a connector-specific admin role. | Change the required tenant role to Security Administrator (or the documented service-specific admin role) plus Microsoft Sentinel Contributor on the workspace. |

### Google Apigee
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Google Cloud Platform Audit Logs
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform Big Query
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform CDN
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform Cloud Monitoring
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform Cloud Run
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform Compute Engine
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform DNS
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform Firewall Logs
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform IAM
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform IDS
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform Load Balancer Logs
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform NAT
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform Resource Manager
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform Security Command Center
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform SQL
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Cloud Platform VPC Flow Logs
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Directory
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Kubernetes Engine
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Google Threat Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Google Workspace Reports
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Gravity Zone
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Grey Noise Threat Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Halcyon
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### HIPAA Compliance
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Holm Security
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### HYAS
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### HYAS Protect
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### I Pinfo
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### iboss
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Illumio Core
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Illumio Insight
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though this pattern needs Azure rights for Event Hub / Logic App / parser deployment and source-platform admin access. | Add Azure Contributor/Sentinel permissions and the source-platform admin/API prerequisite. |

### Illusive Platform
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### Imperva Cloud WAF
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### Imperva WAF Gateway
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Infoblox
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Infoblox Cloud Data Connector
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Infoblox NIOS
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Infoblox SOC Insights
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Integration for Atlassian Beacon
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Intel471
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Io TOT Threat Monitoringwith Defenderfor Io T
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### IONIX
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though this pattern needs Azure rights for Event Hub / Logic App / parser deployment and source-platform admin access. | Add Azure Contributor/Sentinel permissions and the source-platform admin/API prerequisite. |

### IP Quality Score
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Iron Net Iron Defense
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### ISC Bind
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Island
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though this pattern needs Azure rights for Event Hub / Logic App / parser deployment and source-platform admin access. | Add Azure Contributor/Sentinel permissions and the source-platform admin/API prerequisite. |

### Ivanti Unified Endpoint Management
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Jamf Protect
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### JBoss
#### ✅ Correct
- Host-based AMA + DCR collection is the right base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc rights for non-Azure hosts. | Add Monitoring Contributor and note Azure Connected Machine permissions when targets are outside Azure. |

### Joe Sandbox
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Joshua-Cyberiskvision
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Juniper IDP
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Juniper SRX
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Keeper Security
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Know Be4 Defend
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### KQL Training
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Lastpass Enterprise Activity Monitoring
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Legacy IOC based Threat Protection
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Lookout
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Lookout Cloud Security Platform for Microsoft Sentinel
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Lumen Defender Threat Feed
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Mail Risk
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Malware Protection Essentials
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Mark Logic Audit
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Mc Afee Network Security Platform
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### McAfee ePolicy Orchestrator
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### mesh Stack
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Microsoft 365
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Microsoft 365 Assets
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Microsoft Business Applications
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Microsoft Copilot
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Security Reader is view-only; official setup for Entra / Defender streaming requires Security Administrator or a connector-specific admin role. | Change the required tenant role to Security Administrator (or the documented service-specific admin role) plus Microsoft Sentinel Contributor on the workspace. |

### Microsoft Defender for Cloud
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Microsoft Defender for Cloud Apps
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Security Reader is view-only; official setup for Entra / Defender streaming requires Security Administrator or a connector-specific admin role. | Change the required tenant role to Security Administrator (or the documented service-specific admin role) plus Microsoft Sentinel Contributor on the workspace. |

### Microsoft Defender For Endpoint
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Security Reader is view-only; official setup for Entra / Defender streaming requires Security Administrator or a connector-specific admin role. | Change the required tenant role to Security Administrator (or the documented service-specific admin role) plus Microsoft Sentinel Contributor on the workspace. |

### Microsoft Defender for Identity
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Security Reader is view-only; official setup for Entra / Defender streaming requires Security Administrator or a connector-specific admin role. | Change the required tenant role to Security Administrator (or the documented service-specific admin role) plus Microsoft Sentinel Contributor on the workspace. |

### Microsoft Defender for Office 365
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Security Reader is view-only; official setup for Entra / Defender streaming requires Security Administrator or a connector-specific admin role. | Change the required tenant role to Security Administrator (or the documented service-specific admin role) plus Microsoft Sentinel Contributor on the workspace. |

### Microsoft Defender Threat Intelligence
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Security Reader is view-only; official setup for Entra / Defender streaming requires Security Administrator or a connector-specific admin role. | Change the required tenant role to Security Administrator (or the documented service-specific admin role) plus Microsoft Sentinel Contributor on the workspace. |

### Microsoft Defender XDR
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Dependencies | Moderate | The task list misses the documented cutover step to avoid duplicate incidents when Defender XDR replaces individual Defender product incident flows. | Add a pre-cutover dependency to disable duplicate Microsoft incident creation paths and note that the connector is auto-enabled in the Defender portal. |
| 2 | Roles | Moderate | Security Reader is view-only; official setup for Entra / Defender streaming requires Security Administrator or a connector-specific admin role. | Change the required tenant role to Security Administrator (or the documented service-specific admin role) plus Microsoft Sentinel Contributor on the workspace. |

### Microsoft Entra ID
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Security Reader is view-only; official setup for Entra / Defender streaming requires Security Administrator or a connector-specific admin role. | Change the required tenant role to Security Administrator (or the documented service-specific admin role) plus Microsoft Sentinel Contributor on the workspace. |

### Microsoft Entra ID Assets
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Security Reader is view-only; official setup for Entra / Defender streaming requires Security Administrator or a connector-specific admin role. | Change the required tenant role to Security Administrator (or the documented service-specific admin role) plus Microsoft Sentinel Contributor on the workspace. |

### Microsoft Entra ID Protection
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | Security Reader is view-only; official setup for Entra / Defender streaming requires Security Administrator or a connector-specific admin role. | Change the required tenant role to Security Administrator (or the documented service-specific admin role) plus Microsoft Sentinel Contributor on the workspace. |

### Microsoft Exchange Security - Exchange On-Premises
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Microsoft Exchange Security - Exchange Online
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Microsoft Power BI
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Microsoft Project
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Microsoft Purview
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Microsoft Purview Information Protection
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Microsoft Sysmon For Linux
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Microsoft Windows SQL Server Database Audit
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Mimecast
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Mimecast Audit
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Mimecast SEG
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Mimecast TI Regional
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Mimecast TTP
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Minemeld
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Miro
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though source-cloud export connectors require source-platform IAM/service permissions plus Sentinel workspace access. | Capture both the Azure workspace role and the source-platform IAM/service-account prerequisite. |
| 2 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### MISP2 Sentinel
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Mongo DB Atlas
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Mongo DB Audit
#### ✅ Correct
- Host-based AMA + DCR collection is the right base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc rights for non-Azure hosts. | Add Monitoring Contributor and note Azure Connected Machine permissions when targets are outside Azure. |

### Morphisec
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Mulesoft
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Multi Cloud Attack Coverage Essentials - Resource Abuse
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Nasuni
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### NC Protect Data Connector
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### NCSC-NL NDN Cyber Threat Intelligence Sharing
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Net App Ransomware Resilience
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Net Clean Pro Active
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Netskope
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Netskope Web Tx
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Netskopev2
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Network Session Essentials
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Network Threat Protection Essentials
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Netwrix Auditor
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### NGINX HTTP Server
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Noname API Security Solution for Microsoft Sentinel
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Nord Pass
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Nozomi Networks
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Obsidian Datasharing
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Onapsis Defend
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Onapsis Platform
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### One Identity
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### One Trust
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### OneLogin IAM
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Open AI
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Open VPN
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Oracle Cloud Infrastructure
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Oracle Database Audit
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Oracle Web Logic Server
#### ✅ Correct
- Host-based AMA + DCR collection is the right base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc rights for non-Azure hosts. | Add Monitoring Contributor and note Azure Connected Machine permissions when targets are outside Azure. |

### Orca Security Alerts
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### OSSEC
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Palo Alto CDL
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Palo Alto Cortex XDR CCP
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Palo Alto Cortex Xpanse CCF
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Palo Alto Prisma Cloud
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Palo Alto Prisma Cloud CWPP
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Pathlock T Dn R
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### PCI DSS Compliance
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Perimeter 81
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Phosphorus
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Ping Federate
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Ping One
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Postgre SQL
#### ✅ Correct
- Host-based AMA + DCR collection is the right base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc rights for non-Azure hosts. | Add Monitoring Contributor and note Azure Connected Machine permissions when targets are outside Azure. |

### Proof Point Tap
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Proofpoint On demand(POD) Email Security
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Pulse Connect Secure
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Pure Storage
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Qualys VM Knowledgebase
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Quokka
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Radiflow
#### ✅ Correct
- Host-based AMA + DCR collection is the right base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc rights for non-Azure hosts. | Add Monitoring Contributor and note Azure Connected Machine permissions when targets are outside Azure. |

### Rapid7 InsightVM
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Recorded Future
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Recorded Future Identity
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Red Sift
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Reversing Labs
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Ridge Security
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### RSA Secur ID
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### RSAID Plus Admin Logs Connector
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Rubrik Security Cloud
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though source-cloud export connectors require source-platform IAM/service permissions plus Sentinel workspace access. | Capture both the Azure workspace role and the source-platform IAM/service-account prerequisite. |
| 2 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Sail Point Identity Now
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Salem Cyber
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Salesforce Service Cloud
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though source-cloud export connectors require source-platform IAM/service permissions plus Sentinel workspace access. | Capture both the Azure workspace role and the source-platform IAM/service-account prerequisite. |
| 2 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Samsung Knox Asset Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### SAP BTP
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### SAP ETD Cloud
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### SAP Log Serv
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### SAP S4 Cloud Public Edition
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Security Bridge App
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Security Scorecard Cybersecurity Ratings
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Security Threat Essential Solution
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Semperis Directory Services Protector
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Semperis Lightning
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Senserva Pro
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Sentinel One
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Sentinel SOAR Essentials
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Seraphic Security
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Service Now TISC
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### ServiceNow
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Sevco Security
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Shadow Byte Aria
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Shodan
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### SIGNL4
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Silverfort
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### SINEC Security Guard
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Slash Next
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Slash Next SIEM
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Snowflake
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### SOC Handbook
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### SOC Prime CCF
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### SOC Radar
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Sonic Wall Firewall
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Sonrai Security
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Sophos Cloud Optix
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Sophos Endpoint Protection
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Sophos XG Firewall
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### SOX IT Compliance
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Spur
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Spy Cloud Enterprise Protection
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Squadra Technologies Sec Rmm
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Squid Proxy
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Strider Shield
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Styx Intelligence
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Symantec Endpoint Protection
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Symantec Integrated Cyber Defense
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Symantec Proxy SG
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Symantec VIP
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Synqly Integration Connector
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Syslog
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Accuracy | Minor | Validation is generic even though the official connector output is well-defined for this connector family. | Call out Syslog explicitly in validation/testing steps. |
| 2 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### Sysmon via AMA
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Tacit Red Threat Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Tacit Red-Defender-Threat Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Tacit Red-IOC-Crowd Strike
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Tacit Red-Sentinel One
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Talon
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Tanium
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Team Cymru Scout
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Teams
#### ✅ Correct
- Tenant-native Microsoft 365 / Defender onboarding flow is directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Tenable App
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Tenable IO
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### The Hive
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Theom
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Threat Connect
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Threat Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Threat Intelligence (NEW)
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Threat Intelligence Solution for Azure Government
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Tomcat
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Torq
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Transmit Security
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Trellix
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Trend Micro Apex One
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Trend Micro Cloud App Security
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Trend Micro Deep Security
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Trend Micro Tipping Point
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Trend Micro Vision One
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Tropico
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though this pattern needs Azure rights for Event Hub / Logic App / parser deployment and source-platform admin access. | Add Azure Contributor/Sentinel permissions and the source-platform admin/API prerequisite. |

### Ubiquiti Uni Fi
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### UEBA Essentials
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Upwind
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### UR Lhaus
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### v Armour Application Controller
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### V Mware Carbon Black Cloud
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though source-cloud export connectors require source-platform IAM/service permissions plus Sentinel workspace access. | Capture both the Azure workspace role and the source-platform IAM/service-account prerequisite. |
| 2 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### V Mware SASE
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Vaikora Security Center
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Vaikora-Crowd Strike-Threat Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Vaikora-Sentinel
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Vaikora-Sentinel One-Threat Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Valence Security
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Valimail Enforce
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Varonis Purview
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Varonis Saa S
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Vectra AI Detect
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Vectra AI Stream
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Vectra XDR
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Veeam
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Veritas Net Backup
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Versasec CMS
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Virtual Metric Data Stream
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though source-cloud export connectors require source-platform IAM/service permissions plus Sentinel workspace access. | Capture both the Azure workspace role and the source-platform IAM/service-account prerequisite. |
| 2 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Virus Total
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Visa Threat Intelligence (VTI)
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### VM Ray
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### VMware ESXi
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### VMware vCenter
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Votiro
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Watchguard Firebox
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Watchlists Utilities
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Web Session Essentials
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### Web Shells Threat Protection
#### ✅ Correct
- Host-based AMA + DCR collection is the right base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc rights for non-Azure hosts. | Add Monitoring Contributor and note Azure Connected Machine permissions when targets are outside Azure. |

### Windows DNS Events via AMA
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Windows Firewall
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### Windows Firewall via AMA
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Windows Forwarded Events
#### ✅ Correct
- Collector-centric AMA onboarding is the correct base pattern for this connector.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Infrastructure | Critical | Official guidance requires WEC/WEF to be enabled and the collector already receiving ForwardedEvents, but the entry only lists VM/agent/DCR prerequisites. | Add WEC server readiness, WEF subscription design, ForwardedEvents channel sizing, and collector topology as explicit prerequisites/tasks. |
| 2 | Roles | Moderate | The role set covers VM/workspace access but still omits DCR-specific Monitoring Contributor and the conditional Arc permission for non-Azure collectors. | Add Monitoring Contributor and note Azure Connected Machine rights when the WEC server is outside Azure. |
| 3 | Duration | Moderate | The estimate is only realistic when a healthy WEC/WEF estate already exists; building WEC subscriptions from scratch takes materially longer. | Model separate durations for existing-WEC versus build-WEC scenarios. |
| 4 | Accuracy | Minor | Validation is generic even though official guidance is collector-centric and lands in WindowsEvent with Channel = ForwardedEvents. | Add a concrete validation step against WindowsEvent / ForwardedEvents. |

### Windows Forwarded Events via AMA
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Windows Security Events
#### ✅ Correct
- AMA + DCR on Windows hosts is the correct official collection model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Infrastructure | Critical | Azure Arc is modeled as a mandatory 40h task, but official Windows-based AMA guidance only requires Arc for non-Azure machines. The entry also omits Windows audit-policy/event-set readiness. | Make Arc conditional, split host readiness from Arc onboarding, and add an explicit audit-policy / Common-Minimal-Custom event-set prerequisite. |
| 2 | Roles | Critical | The permissions block is empty even though this connector needs workspace write access plus DCR/AMA deployment rights on the target hosts. | Populate required roles with Microsoft Sentinel Contributor + Monitoring Contributor + VM Contributor / Azure Connected Machine Resource Administrator (or equivalent least-privilege combination). |
| 3 | Duration | Moderate | A fixed 40h Arc task will massively overstate Azure-only rollouts and still under-model larger mixed estates. | Replace the single 40h task with a conditional/per-host scaling model. |
| 4 | Completeness | Moderate | Validation never explicitly calls out the SecurityEvent table or confirmation of the chosen Windows Security Events set. | Add verification against SecurityEvent and a check that the selected Common / Minimal / Custom set is the one actually deployed. |

### Windows Server DNS
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Wire X Network Forensics Platform
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### With Secure Elements Via Connector
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The role set omits Monitoring Contributor for DCR creation/editing and does not mention Azure Arc / Connected Machine rights when the forwarder is outside Azure. | Add Monitoring Contributor and note Azure Connected Machine Resource Administrator (or equivalent) for non-Azure forwarders. |

### With Secure Elements Via Function
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Wiz
#### ✅ Correct
- Source-cloud export plus Sentinel connection is the right overall integration model.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Owner | Moderate | The sole owner is Azure Platform Admin, but these connectors also need a source-cloud / IAM owner to create export paths and service roles (for example AWS CloudTrail + S3 + SQS + IAM). | Use a joint Cloud Platform / IAM owner model, or at minimum note a required secondary source-platform owner. |

### Workday
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Workplace from Facebook
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### XBOW
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
- None in this QA pass.

### Zero Fox
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Zero Fox Alerts
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Zero Fox Threat Intelligence
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though official docs still require workspace rights and source-platform admin/API access. | Populate the minimum Azure/M365 role set and the source-side admin/API prerequisite. |

### Zero Networks
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Zimperium Mobile Threat Defense
#### ✅ Correct
- An integration-first ingestion flow is directionally correct for this connector family.

#### ⚠️ Issues Found
- None in this QA pass.

### Zinc Open Source
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.

### Zoom Reports
#### ✅ Correct
- Azure Function + API credential onboarding matches the official connector pattern.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though function-based connectors require Azure rights to create/manage the Function App plus vendor API admin/token access. | Populate Azure Contributor-level deployment rights and the vendor-side admin/API prerequisite explicitly. |

### Zscaler Internet Access
#### ✅ Correct
- Linux forwarder + AMA + DCR is the correct base architecture.

#### ⚠️ Issues Found
| # | Category | Severity | Finding | Recommendation |
|---|----------|----------|---------|----------------|
| 1 | Roles | Moderate | The permissions block is empty even though Syslog/CEF-style connectors still need Azure rights for AMA/DCR deployment and Arc on non-Azure forwarders. | Add Microsoft Sentinel Contributor + Monitoring Contributor + VM/Arc deployment rights, plus the device-admin prerequisite. |

### Zscaler Private Access (ZPA)
#### ✅ Correct
- API / codeless onboarding flow and validation sequencing are directionally correct.

#### ⚠️ Issues Found
- None in this QA pass.
