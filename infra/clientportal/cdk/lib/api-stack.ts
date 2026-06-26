import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface ApiStackProps extends cdk.StackProps {
  userPool?: cognito.IUserPool;
  usersTable?: dynamodb.ITable;
  discoveryResponsesTable?: dynamodb.ITable;
  outcomesTable?: dynamodb.ITable;
  intakeFormsTable?: dynamodb.ITable;
  programsTable?: dynamodb.ITable;
  weeklyContentTable?: dynamodb.ITable;
  adminQueueTable?: dynamodb.ITable;
  appConfigTable?: dynamodb.ITable;
  tierCatalogTable?: dynamodb.ITable;
  contactTable?: dynamodb.ITable;
  patientRecordsTable?: dynamodb.ITable;
  eventsTable?: dynamodb.ITable;
  eventRsvpsTable?: dynamodb.ITable;
  adherenceTable?: dynamodb.ITable;
}

const RESOLVERS_DIR = path.join(__dirname, '..', 'resolvers');
const SCHEMA_PATH = path.join(__dirname, '..', '..', 'appsync', 'schema.graphql');

const JS_RUNTIME = appsync.FunctionRuntime.JS_1_0_0;

export class ApiStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;

  constructor(scope: Construct, id: string, props: ApiStackProps = {}) {
    super(scope, id, props);

    const userPool =
      props.userPool ??
      new cognito.UserPool(this, 'StubUserPool', {
        userPoolName: `${id}-stub-pool`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

    const userOwned = (key: string, name: string): dynamodb.ITable => {
      const t = new dynamodb.Table(this, `Stub${key}`, {
        tableName: `${id}-${name}`,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
      t.addGlobalSecondaryIndex({
        indexName: 'byOwner',
        partitionKey: { name: 'owner', type: dynamodb.AttributeType.STRING },
        projectionType: dynamodb.ProjectionType.ALL,
      });
      return t;
    };
    const simple = (key: string, name: string, pk = 'id'): dynamodb.ITable =>
      new dynamodb.Table(this, `Stub${key}`, {
        tableName: `${id}-${name}`,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: pk, type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

    const usersTable = props.usersTable ?? userOwned('Users', 'Users');
    const discoveryTable =
      props.discoveryResponsesTable ?? userOwned('Discovery', 'DiscoveryResponses');
    const outcomesTable = props.outcomesTable ?? userOwned('Outcomes', 'Outcomes');
    const intakeTable =
      props.intakeFormsTable ?? userOwned('Intake', 'IntakeForms');
    const programsTable = props.programsTable ?? simple('Programs', 'Programs');
    const weeklyTable =
      props.weeklyContentTable ?? simple('WeeklyContent', 'WeeklyContent');
    const adminQueueTable =
      props.adminQueueTable ?? simple('AdminQueue', 'AdminQueue');
    const appConfigTable =
      props.appConfigTable ?? simple('AppConfig', 'AppConfig', 'key');
    const tierCatalogTable =
      props.tierCatalogTable ?? simple('TierCatalog', 'TierCatalog');
    const eventsTable =
      props.eventsTable ?? simple('Events', 'Events', 'eventId');
    const eventRsvpsTable =
      props.eventRsvpsTable ?? new dynamodb.Table(this, 'StubEventRsvps', {
        tableName: `${id}-EventRSVPs`,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'contactId', type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    const adherenceTable =
      props.adherenceTable ?? new dynamodb.Table(this, 'StubAdherence', {
        tableName: `${id}-Adherence`,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'dateActionId', type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

    this.api = new appsync.GraphqlApi(this, 'Api', {
      name: 'clientportal-api',
      definition: appsync.Definition.fromFile(SCHEMA_PATH),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: { userPool },
        },
        additionalAuthorizationModes: [
          { authorizationType: appsync.AuthorizationType.IAM },
        ],
      },
      xrayEnabled: false,
    });

    const dsUsers = this.api.addDynamoDbDataSource('UsersDS', usersTable);
    const dsOutcomes = this.api.addDynamoDbDataSource('OutcomesDS', outcomesTable);
    const dsAppConfig = this.api.addDynamoDbDataSource('AppConfigDS', appConfigTable);
    const dsPrograms = this.api.addDynamoDbDataSource('ProgramsDS', programsTable);
    const dsWeekly = this.api.addDynamoDbDataSource('WeeklyDS', weeklyTable);
    const dsTierCatalog = this.api.addDynamoDbDataSource('TierCatalogDS', tierCatalogTable);
    this.api.addDynamoDbDataSource('DiscoveryDS', discoveryTable);
    this.api.addDynamoDbDataSource('IntakeDS', intakeTable);
    this.api.addDynamoDbDataSource('AdminQueueDS', adminQueueTable);
    const contactTable =
      props.contactTable ??
      new dynamodb.Table(this, 'StubContact', {
        tableName: `${id}-Contact`,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: 'contactId', type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    const dsContact = this.api.addDynamoDbDataSource('ContactDS', contactTable);

    const patientRecordsTable =
      props.patientRecordsTable ??
      new dynamodb.Table(this, 'StubPatientRecords', {
        tableName: `${id}-PatientRecords`,
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        partitionKey: { name: 'contactId', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    const dsPatientRecords = this.api.addDynamoDbDataSource('PatientRecordsDS', patientRecordsTable);

    const dsEvents = this.api.addDynamoDbDataSource('EventsDS', eventsTable);
    const dsEventRsvps = this.api.addDynamoDbDataSource('EventRsvpsDS', eventRsvpsTable);
    const dsAdherence = this.api.addDynamoDbDataSource('AdherenceDS', adherenceTable);

    const code = (file: string) =>
      appsync.Code.fromAsset(path.join(RESOLVERS_DIR, file));

    // getMyProfile pipeline (auto-create on missing)
    const getFn = new appsync.AppsyncFunction(this, 'GetProfileFn', {
      api: this.api,
      dataSource: dsUsers,
      name: 'getProfileFn',
      runtime: JS_RUNTIME,
      code: code('getMyProfile.get.js'),
    });
    const createFn = new appsync.AppsyncFunction(this, 'CreateProfileFn', {
      api: this.api,
      dataSource: dsUsers,
      name: 'createProfileFn',
      runtime: JS_RUNTIME,
      code: code('getMyProfile.create.js'),
    });
    new appsync.Resolver(this, 'GetMyProfileResolver', {
      api: this.api,
      typeName: 'Query',
      fieldName: 'getMyProfile',
      runtime: JS_RUNTIME,
      code: code('getMyProfile.pipeline.js'),
      pipelineConfig: [getFn, createFn],
    });

    const unitResolver = (
      idStr: string,
      typeName: string,
      fieldName: string,
      ds: appsync.DynamoDbDataSource,
      file: string,
    ) =>
      new appsync.Resolver(this, idStr, {
        api: this.api,
        typeName,
        fieldName,
        dataSource: ds,
        runtime: JS_RUNTIME,
        code: code(file),
      });

    unitResolver('UpsertProfileResolver', 'Mutation', 'upsertMyProfile', dsUsers, 'upsertMyProfile.js');
    unitResolver('UpdateSecondaryEmailResolver', 'Mutation', 'updateSecondaryEmail', dsUsers, 'updateSecondaryEmail.js');
    unitResolver('ListMyOutcomesResolver', 'Query', 'listMyOutcomes', dsOutcomes, 'listMyOutcomes.js');
    unitResolver('CreateOutcomeResolver', 'Mutation', 'createOutcome', dsOutcomes, 'createOutcome.js');
    unitResolver('GetAppConfigResolver', 'Query', 'getAppConfig', dsAppConfig, 'getAppConfig.js');
    unitResolver('AdminListUsersResolver', 'Query', 'adminListUsers', dsUsers, 'adminListUsers.js');
    unitResolver('AdminGetProfileResolver', 'Query', 'adminGetProfile', dsUsers, 'adminGetProfile.js');
    unitResolver('UpsertProgramResolver', 'Mutation', 'upsertProgram', dsPrograms, 'upsertProgram.js');
    unitResolver('UpsertWeeklyContentResolver', 'Mutation', 'upsertWeeklyContent', dsWeekly, 'upsertWeeklyContent.js');
    unitResolver('UpsertTierCatalogResolver', 'Mutation', 'upsertTierCatalog', dsTierCatalog, 'upsertTierCatalog.js');
    unitResolver('UpsertAppConfigResolver', 'Mutation', 'upsertAppConfig', dsAppConfig, 'upsertAppConfig.js');
    unitResolver('UpcomingEventsResolver', 'Query', 'upcomingEvents', dsEvents, 'upcomingEvents.js');
    unitResolver('RsvpEventResolver', 'Mutation', 'rsvpEvent', dsEventRsvps, 'rsvpEvent.js');
    unitResolver('ListProtegesResolver', 'Query', 'listProteges', dsContact, 'listProteges.js');
    unitResolver('ListEventsAdminResolver', 'Query', 'listEventsAdmin', dsEvents, 'listEventsAdmin.js');
    unitResolver('UpdateEventRecordingUrlResolver', 'Mutation', 'updateEventRecordingUrl', dsEvents, 'updateEventRecordingUrl.js');
    unitResolver('RecordAdherenceResolver', 'Mutation', 'recordAdherence', dsAdherence, 'recordAdherence.js');
    unitResolver('ListMyAdherenceResolver', 'Query', 'listMyAdherence', dsAdherence, 'listMyAdherence.js');
    unitResolver('ListPatientRecordsAdminResolver', 'Query', 'listPatientRecordsAdmin', dsPatientRecords, 'listPatientRecordsAdmin.js');
    unitResolver('GetPatientRecordAdminResolver', 'Query', 'getPatientRecordAdmin', dsPatientRecords, 'getPatientRecordAdmin.js');
    unitResolver('UpdateEncounterStateAdminResolver', 'Mutation', 'updateEncounterStateAdmin', dsPatientRecords, 'updateEncounterStateAdmin.js');

    new cdk.CfnOutput(this, 'graphqlUrl', { value: this.api.graphqlUrl });
    new cdk.CfnOutput(this, 'apiId', { value: this.api.apiId });
  }
}
