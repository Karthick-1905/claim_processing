import { connectMongoose, PolicyModel, CustomerModel } from "@/lib/models";
import { Policy, Customer } from "@/lib/domain/types";

export interface ValidationCheckResult {
  isValid: boolean;
  errors: string[];
  policy?: Policy;
  customer?: Customer;
}

export async function validatePolicyCoverage(params: {
  policy_id: string;
  customer_id: string;
  incident_date: string;
  claimed_amount: number;
  asset_identifier?: string;
}): Promise<ValidationCheckResult> {
  await connectMongoose();
  const errors: string[] = [];

  const policyDoc = await PolicyModel.findOne({ policy_id: params.policy_id }).lean();
  if (!policyDoc) {
    errors.push(`ERR_POLICY_NOT_FOUND: Policy '${params.policy_id}' does not exist in master records.`);
    return { isValid: false, errors };
  }
  const policy: Policy = JSON.parse(JSON.stringify(policyDoc));

  const customerDoc = await CustomerModel.findOne({ customer_id: params.customer_id }).lean();
  let customer: Customer | undefined;
  if (!customerDoc) {
    errors.push(`ERR_CUSTOMER_NOT_FOUND: Customer '${params.customer_id}' does not exist.`);
  } else {
    customer = JSON.parse(JSON.stringify(customerDoc));
    if (policy.customer_id !== params.customer_id) {
      errors.push(`ERR_CUSTOMER_MISMATCH: Customer '${params.customer_id}' is not the authorized holder of policy '${params.policy_id}'.`);
    }
  }

  if (policy.status !== "ACTIVE") {
    errors.push(`ERR_POLICY_NOT_ACTIVE: Policy '${params.policy_id}' status is '${policy.status}', not ACTIVE.`);
  }

  const incidentTime = new Date(params.incident_date).getTime();
  const policyStartTime = new Date(policy.start_date).getTime();
  const policyEndTime = new Date(policy.end_date).getTime();

  if (incidentTime < policyStartTime || incidentTime > policyEndTime) {
    errors.push(
      `ERR_POLICY_DATE_OUT_OF_BOUNDS: Incident date (${params.incident_date}) falls outside effective coverage window (${policy.start_date} to ${policy.end_date}).`
    );
  }

  if (params.asset_identifier && policy.covered_assets && policy.covered_assets.length > 0) {
    const isCovered = policy.covered_assets.some(
      (asset) => asset.identifier.toUpperCase() === params.asset_identifier?.toUpperCase()
    );
    if (!isCovered) {
      errors.push(
        `ERR_ASSET_NOT_COVERED: Asset '${params.asset_identifier}' is not registered under covered assets for policy '${params.policy_id}'.`
      );
    }
  }

  if (params.claimed_amount > policy.coverage_limit) {
    errors.push(
      `ERR_EXCEEDS_COVERAGE_LIMIT: Claimed amount ($${params.claimed_amount.toLocaleString()}) exceeds maximum policy ceiling ($${policy.coverage_limit.toLocaleString()}).`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    policy,
    customer,
  };
}

export async function getAllPolicies(): Promise<Policy[]> {
  await connectMongoose();
  const docs = await PolicyModel.find({}).lean();
  return JSON.parse(JSON.stringify(docs));
}

export async function getAllCustomers(): Promise<Customer[]> {
  await connectMongoose();
  const docs = await CustomerModel.find({}).lean();
  return JSON.parse(JSON.stringify(docs));
}
