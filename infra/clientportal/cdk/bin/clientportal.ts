#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ClientPortalStack } from '../lib/clientportal-stack';
import { DataStack } from '../lib/data-stack';
import { AuthStack } from '../lib/auth-stack';
import { ApiStack } from '../lib/api-stack';
import { LeadCaptureStack } from '../lib/lead-capture-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
};

new ClientPortalStack(app, 'ClientPortalStack', { env });
const dataStack = new DataStack(app, 'DataStack', { env });
const authStack = new AuthStack(app, 'AuthStack', { env, usersTable: dataStack.usersTable });
new LeadCaptureStack(app, 'LeadCaptureStack', { env, usersTable: dataStack.usersTable });
new ApiStack(app, 'ApiStack', {
  env,
  userPool: authStack.userPool,
  usersTable: dataStack.usersTable,
  discoveryResponsesTable: dataStack.discoveryResponsesTable,
  outcomesTable: dataStack.outcomesTable,
  intakeFormsTable: dataStack.intakeFormsTable,
  programsTable: dataStack.programsTable,
  weeklyContentTable: dataStack.weeklyContentTable,
  adminQueueTable: dataStack.adminQueueTable,
  appConfigTable: dataStack.appConfigTable,
  tierCatalogTable: dataStack.tierCatalogTable,
  contactTable: dataStack.contactTable,
  eventsTable: dataStack.eventsTable,
  eventRsvpsTable: dataStack.eventRsvpsTable,
  adherenceTable: dataStack.adherenceTable,
  patientRecordsTable: dataStack.patientRecordsTable,
});
