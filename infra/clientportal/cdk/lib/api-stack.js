"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiStack = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const appsync = __importStar(require("aws-cdk-lib/aws-appsync"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const RESOLVERS_DIR = path.join(__dirname, '..', 'resolvers');
const SCHEMA_PATH = path.join(__dirname, '..', '..', 'appsync', 'schema.graphql');
const JS_RUNTIME = appsync.FunctionRuntime.JS_1_0_0;
class ApiStack extends cdk.Stack {
    api;
    constructor(scope, id, props = {}) {
        super(scope, id, props);
        const userPool = props.userPool ??
            new cognito.UserPool(this, 'StubUserPool', {
                userPoolName: `${id}-stub-pool`,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            });
        const userOwned = (key, name) => {
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
        const simple = (key, name, pk = 'id') => new dynamodb.Table(this, `Stub${key}`, {
            tableName: `${id}-${name}`,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: pk, type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const usersTable = props.usersTable ?? userOwned('Users', 'Users');
        const discoveryTable = props.discoveryResponsesTable ?? userOwned('Discovery', 'DiscoveryResponses');
        const outcomesTable = props.outcomesTable ?? userOwned('Outcomes', 'Outcomes');
        const intakeTable = props.intakeFormsTable ?? userOwned('Intake', 'IntakeForms');
        const programsTable = props.programsTable ?? simple('Programs', 'Programs');
        const weeklyTable = props.weeklyContentTable ?? simple('WeeklyContent', 'WeeklyContent');
        const adminQueueTable = props.adminQueueTable ?? simple('AdminQueue', 'AdminQueue');
        const appConfigTable = props.appConfigTable ?? simple('AppConfig', 'AppConfig', 'key');
        const tierCatalogTable = props.tierCatalogTable ?? simple('TierCatalog', 'TierCatalog');
        const eventsTable = props.eventsTable ?? simple('Events', 'Events', 'eventId');
        const eventRsvpsTable = props.eventRsvpsTable ?? new dynamodb.Table(this, 'StubEventRsvps', {
            tableName: `${id}-EventRSVPs`,
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'contactId', type: dynamodb.AttributeType.STRING },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        const adherenceTable = props.adherenceTable ?? new dynamodb.Table(this, 'StubAdherence', {
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
        const contactTable = props.contactTable ??
            new dynamodb.Table(this, 'StubContact', {
                tableName: `${id}-Contact`,
                billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
                partitionKey: { name: 'contactId', type: dynamodb.AttributeType.STRING },
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            });
        const dsContact = this.api.addDynamoDbDataSource('ContactDS', contactTable);
        const patientRecordsTable = props.patientRecordsTable ??
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
        const code = (file) => appsync.Code.fromAsset(path.join(RESOLVERS_DIR, file));
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
        const unitResolver = (idStr, typeName, fieldName, ds, file) => new appsync.Resolver(this, idStr, {
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
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3QixpREFBbUM7QUFFbkMsaUVBQW1EO0FBQ25ELGlFQUFtRDtBQUNuRCxtRUFBcUQ7QUFvQnJELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztBQUM5RCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBRWxGLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDO0FBRXBELE1BQWEsUUFBUyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3JCLEdBQUcsQ0FBcUI7SUFFeEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxRQUF1QixFQUFFO1FBQ2pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sUUFBUSxHQUNaLEtBQUssQ0FBQyxRQUFRO1lBQ2QsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7Z0JBQ3pDLFlBQVksRUFBRSxHQUFHLEVBQUUsWUFBWTtnQkFDL0IsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTzthQUN6QyxDQUFDLENBQUM7UUFFTCxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQVcsRUFBRSxJQUFZLEVBQW1CLEVBQUU7WUFDL0QsTUFBTSxDQUFDLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLEdBQUcsRUFBRSxFQUFFO2dCQUMvQyxTQUFTLEVBQUUsR0FBRyxF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QUksRUFBRSxZQUFZLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUM5RCxDQUFDO0NBQ0Y7QUExTEQsNEJBMExDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIGFwcHN5bmMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwcHN5bmMnO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFwaVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHVzZXJQb29sPzogY29nbml0by5JVXNlclBvb2w7XG4gIHVzZXJzVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIGRpc2NvdmVyeVJlc3BvbnNlc1RhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICBvdXRjb21lc1RhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICBpbnRha2VGb3Jtc1RhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICBwcm9ncmFtc1RhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICB3ZWVrbHlDb250ZW50VGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIGFkbWluUXVldWVUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgYXBwQ29uZmlnVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIHRpZXJDYXRhbG9nVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIGNvbnRhY3RUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgcGF0aWVudFJlY29yZHNUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgZXZlbnRzVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIGV2ZW50UnN2cHNUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgYWRoZXJlbmNlVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG59XG5cbmNvbnN0IFJFU09MVkVSU19ESVIgPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAncmVzb2x2ZXJzJyk7XG5jb25zdCBTQ0hFTUFfUEFUSCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICdhcHBzeW5jJywgJ3NjaGVtYS5ncmFwaHFsJyk7XG5cbmNvbnN0IEpTX1JVTlRJTUUgPSBhcHBzeW5jLkZ1bmN0aW9uUnVudGltZS5KU18xXzBfMDtcblxuZXhwb3J0IGNsYXNzIEFwaVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogYXBwc3luYy5HcmFwaHFsQXBpO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBcGlTdGFja1Byb3BzID0ge30pIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IHVzZXJQb29sID1cbiAgICAgIHByb3BzLnVzZXJQb29sID8/XG4gICAgICBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCAnU3R1YlVzZXJQb29sJywge1xuICAgICAgICB1c2VyUG9vbE5hbWU6IGAke2lkfS1zdHViLXBvb2xgLFxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgfSk7XG5cbiAgICBjb25zdCB1c2VyT3duZWQgPSAoa2V5OiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGR5bmFtb2RiLklUYWJsZSA9PiB7XG4gICAgICBjb25zdCB0ID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIGBTdHViJHtrZXl9YCwge1xuICAgICAgICB0YWJsZU5hbWU6IGAke2lkfS0ke25hbWV9YCxcbiAgICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdpZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB9KTtcbiAgICAgIHQuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgICBpbmRleE5hbWU6ICdieU93bmVyJyxcbiAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdvd25lcicsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0O1xuICAgIH07XG4gICAgY29uc3Qgc2ltcGxlID0gKGtleTogc3RyaW5nLCBuYW1lOiBzdHJpbmcsIHBrID0gJ2lkJyk6IGR5bmFtb2RiLklUYWJsZSA9PlxuICAgICAgbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIGBTdHViJHtrZXl9YCwge1xuICAgICAgICB0YWJsZU5hbWU6IGAke2lkfS0ke25hbWV9YCxcbiAgICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IHBrLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgfSk7XG5cbiAgICBjb25zdCB1c2Vyc1RhYmxlID0gcHJvcHMudXNlcnNUYWJsZSA/PyB1c2VyT3duZWQoJ1VzZXJzJywgJ1VzZXJzJyk7XG4gICAgY29uc3QgZGlzY292ZXJ5VGFibGUgPVxuICAgICAgcHJvcHMuZGlzY292ZXJ5UmVzcG9uc2VzVGFibGUgPz8gdXNlck93bmVkKCdEaXNjb3ZlcnknLCAnRGlzY292ZXJ5UmVzcG9uc2VzJyk7XG4gICAgY29uc3Qgb3V0Y29tZXNUYWJsZSA9IHByb3BzLm91dGNvbWVzVGFibGUgPz8gdXNlck93bmVkKCdPdXRjb21lcycsICdPdXRjb21lcycpO1xuICAgIGNvbnN0IGludGFrZVRhYmxlID1cbiAgICAgIHByb3BzLmludGFrZUZvcm1zVGFibGUgPz8gdXNlck93bmVkKCdJbnRha2UnLCAnSW50YWtlRm9ybXMnKTtcbiAgICBjb25zdCBwcm9ncmFtc1RhYmxlID0gcHJvcHMucHJvZ3JhbXNUYWJsZSA/PyBzaW1wbGUoJ1Byb2dyYW1zJywgJ1Byb2dyYW1zJyk7XG4gICAgY29uc3Qgd2Vla2x5VGFibGUgPVxuICAgICAgcHJvcHMud2Vla2x5Q29udGVudFRhYmxlID8/IHNpbXBsZSgnV2Vla2x5Q29udGVudCcsICdXZWVrbHlDb250ZW50Jyk7XG4gICAgY29uc3QgYWRtaW5RdWV1ZVRhYmxlID1cbiAgICAgIHByb3BzLmFkbWluUXVldWVUYWJsZSA/PyBzaW1wbGUoJ0FkbWluUXVldWUnLCAnQWRtaW5RdWV1ZScpO1xuICAgIGNvbnN0IGFwcENvbmZpZ1RhYmxlID1cbiAgICAgIHByb3BzLmFwcENvbmZpZ1RhYmxlID8/IHNpbXBsZSgnQXBwQ29uZmlnJywgJ0FwcENvbmZpZycsICdrZXknKTtcbiAgICBjb25zdCB0aWVyQ2F0YWxvZ1RhYmxlID1cbiAgICAgIHByb3BzLnRpZXJDYXRhbG9nVGFibGUgPz8gc2ltcGxlKCdUaWVyQ2F0YWxvZycsICdUaWVyQ2F0YWxvZycpO1xuICAgIGNvbnN0IGV2ZW50c1RhYmxlID1cbiAgICAgIHByb3BzLmV2ZW50c1RhYmxlID8/IHNpbXBsZSgnRXZlbnRzJywgJ0V2ZW50cycsICdldmVudElkJyk7XG4gICAgY29uc3QgZXZlbnRSc3Zwc1RhYmxlID1cbiAgICAgIHByb3BzLmV2ZW50UnN2cHNUYWJsZSA/PyBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1N0dWJFdmVudFJzdnBzJywge1xuICAgICAgICB0YWJsZU5hbWU6IGAke2lkfS1FdmVudFJTVlBzYCxcbiAgICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdldmVudElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgc29ydEtleTogeyBuYW1lOiAnY29udGFjdElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuICAgIGNvbnN0IGFkaGVyZW5jZVRhYmxlID1cbiAgICAgIHByb3BzLmFkaGVyZW5jZVRhYmxlID8/IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnU3R1YkFkaGVyZW5jZScsIHtcbiAgICAgICAgdGFibGVOYW1lOiBgJHtpZH0tQWRoZXJlbmNlYCxcbiAgICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICdkYXRlQWN0aW9uSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgfSk7XG5cbiAgICB0aGlzLmFwaSA9IG5ldyBhcHBzeW5jLkdyYXBocWxBcGkodGhpcywgJ0FwaScsIHtcbiAgICAgIG5hbWU6ICdjbGllbnRwb3J0YWwtYXBpJyxcbiAgICAgIGRlZmluaXRpb246IGFwcHN5bmMuRGVmaW5pdGlvbi5mcm9tRmlsZShTQ0hFTUFfUEFUSCksXG4gICAgICBhdXRob3JpemF0aW9uQ29uZmlnOiB7XG4gICAgICAgIGRlZmF1bHRBdXRob3JpemF0aW9uOiB7XG4gICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwcHN5bmMuQXV0aG9yaXphdGlvblR5cGUuVVNFUl9QT09MLFxuICAgICAgICAgIHVzZXJQb29sQ29uZmlnOiB7IHVzZXJQb29sIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxBdXRob3JpemF0aW9uTW9kZXM6IFtcbiAgICAgICAgICB7IGF1dGhvcml6YXRpb25UeXBlOiBhcHBzeW5jLkF1dGhvcml6YXRpb25UeXBlLklBTSB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHhyYXlFbmFibGVkOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGRzVXNlcnMgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ1VzZXJzRFMnLCB1c2Vyc1RhYmxlKTtcbiAgICBjb25zdCBkc091dGNvbWVzID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdPdXRjb21lc0RTJywgb3V0Y29tZXNUYWJsZSk7XG4gICAgY29uc3QgZHNBcHBDb25maWcgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ0FwcENvbmZpZ0RTJywgYXBwQ29uZmlnVGFibGUpO1xuICAgIGNvbnN0IGRzUHJvZ3JhbXMgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ1Byb2dyYW1zRFMnLCBwcm9ncmFtc1RhYmxlKTtcbiAgICBjb25zdCBkc1dlZWtseSA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnV2Vla2x5RFMnLCB3ZWVrbHlUYWJsZSk7XG4gICAgY29uc3QgZHNUaWVyQ2F0YWxvZyA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnVGllckNhdGFsb2dEUycsIHRpZXJDYXRhbG9nVGFibGUpO1xuICAgIHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnRGlzY292ZXJ5RFMnLCBkaXNjb3ZlcnlUYWJsZSk7XG4gICAgdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdJbnRha2VEUycsIGludGFrZVRhYmxlKTtcbiAgICB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ0FkbWluUXVldWVEUycsIGFkbWluUXVldWVUYWJsZSk7XG4gICAgY29uc3QgY29udGFjdFRhYmxlID1cbiAgICAgIHByb3BzLmNvbnRhY3RUYWJsZSA/P1xuICAgICAgbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdTdHViQ29udGFjdCcsIHtcbiAgICAgICAgdGFibGVOYW1lOiBgJHtpZH0tQ29udGFjdGAsXG4gICAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnY29udGFjdElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuICAgIGNvbnN0IGRzQ29udGFjdCA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnQ29udGFjdERTJywgY29udGFjdFRhYmxlKTtcblxuICAgIGNvbnN0IHBhdGllbnRSZWNvcmRzVGFibGUgPVxuICAgICAgcHJvcHMucGF0aWVudFJlY29yZHNUYWJsZSA/P1xuICAgICAgbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdTdHViUGF0aWVudFJlY29yZHMnLCB7XG4gICAgICAgIHRhYmxlTmFtZTogYCR7aWR9LVBhdGllbnRSZWNvcmRzYCxcbiAgICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdjb250YWN0SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICdzaycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB9KTtcbiAgICBjb25zdCBkc1BhdGllbnRSZWNvcmRzID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdQYXRpZW50UmVjb3Jkc0RTJywgcGF0aWVudFJlY29yZHNUYWJsZSk7XG5cbiAgICBjb25zdCBkc0V2ZW50cyA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnRXZlbnRzRFMnLCBldmVudHNUYWJsZSk7XG4gICAgY29uc3QgZHNFdmVudFJzdnBzID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdFdmVudFJzdnBzRFMnLCBldmVudFJzdnBzVGFibGUpO1xuICAgIGNvbnN0IGRzQWRoZXJlbmNlID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdBZGhlcmVuY2VEUycsIGFkaGVyZW5jZVRhYmxlKTtcblxuICAgIGNvbnN0IGNvZGUgPSAoZmlsZTogc3RyaW5nKSA9PlxuICAgICAgYXBwc3luYy5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oUkVTT0xWRVJTX0RJUiwgZmlsZSkpO1xuXG4gICAgLy8gZ2V0TXlQcm9maWxlIHBpcGVsaW5lIChhdXRvLWNyZWF0ZSBvbiBtaXNzaW5nKVxuICAgIGNvbnN0IGdldEZuID0gbmV3IGFwcHN5bmMuQXBwc3luY0Z1bmN0aW9uKHRoaXMsICdHZXRQcm9maWxlRm4nLCB7XG4gICAgICBhcGk6IHRoaXMuYXBpLFxuICAgICAgZGF0YVNvdXJjZTogZHNVc2VycyxcbiAgICAgIG5hbWU6ICdnZXRQcm9maWxlRm4nLFxuICAgICAgcnVudGltZTogSlNfUlVOVElNRSxcbiAgICAgIGNvZGU6IGNvZGUoJ2dldE15UHJvZmlsZS5nZXQuanMnKSxcbiAgICB9KTtcbiAgICBjb25zdCBjcmVhdGVGbiA9IG5ldyBhcHBzeW5jLkFwcHN5bmNGdW5jdGlvbih0aGlzLCAnQ3JlYXRlUHJvZmlsZUZuJywge1xuICAgICAgYXBpOiB0aGlzLmFwaSxcbiAgICAgIGRhdGFTb3VyY2U6IGRzVXNlcnMsXG4gICAgICBuYW1lOiAnY3JlYXRlUHJvZmlsZUZuJyxcbiAgICAgIHJ1bnRpbWU6IEpTX1JVTlRJTUUsXG4gICAgICBjb2RlOiBjb2RlKCdnZXRNeVByb2ZpbGUuY3JlYXRlLmpzJyksXG4gICAgfSk7XG4gICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgJ0dldE15UHJvZmlsZVJlc29sdmVyJywge1xuICAgICAgYXBpOiB0aGlzLmFwaSxcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnZ2V0TXlQcm9maWxlJyxcbiAgICAgIHJ1bnRpbWU6IEpTX1JVTlRJTUUsXG4gICAgICBjb2RlOiBjb2RlKCdnZXRNeVByb2ZpbGUucGlwZWxpbmUuanMnKSxcbiAgICAgIHBpcGVsaW5lQ29uZmlnOiBbZ2V0Rm4sIGNyZWF0ZUZuXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVuaXRSZXNvbHZlciA9IChcbiAgICAgIGlkU3RyOiBzdHJpbmcsXG4gICAgICB0eXBlTmFtZTogc3RyaW5nLFxuICAgICAgZmllbGROYW1lOiBzdHJpbmcsXG4gICAgICBkczogYXBwc3luYy5EeW5hbW9EYkRhdGFTb3VyY2UsXG4gICAgICBmaWxlOiBzdHJpbmcsXG4gICAgKSA9PlxuICAgICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgaWRTdHIsIHtcbiAgICAgICAgYXBpOiB0aGlzLmFwaSxcbiAgICAgICAgdHlwZU5hbWUsXG4gICAgICAgIGZpZWxkTmFtZSxcbiAgICAgICAgZGF0YVNvdXJjZTogZHMsXG4gICAgICAgIHJ1bnRpbWU6IEpTX1JVTlRJTUUsXG4gICAgICAgIGNvZGU6IGNvZGUoZmlsZSksXG4gICAgICB9KTtcblxuICAgIHVuaXRSZXNvbHZlcignVXBzZXJ0UHJvZmlsZVJlc29sdmVyJywgJ011dGF0aW9uJywgJ3Vwc2VydE15UHJvZmlsZScsIGRzVXNlcnMsICd1cHNlcnRNeVByb2ZpbGUuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1VwZGF0ZVNlY29uZGFyeUVtYWlsUmVzb2x2ZXInLCAnTXV0YXRpb24nLCAndXBkYXRlU2Vjb25kYXJ5RW1haWwnLCBkc1VzZXJzLCAndXBkYXRlU2Vjb25kYXJ5RW1haWwuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0xpc3RNeU91dGNvbWVzUmVzb2x2ZXInLCAnUXVlcnknLCAnbGlzdE15T3V0Y29tZXMnLCBkc091dGNvbWVzLCAnbGlzdE15T3V0Y29tZXMuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0NyZWF0ZU91dGNvbWVSZXNvbHZlcicsICdNdXRhdGlvbicsICdjcmVhdGVPdXRjb21lJywgZHNPdXRjb21lcywgJ2NyZWF0ZU91dGNvbWUuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0dldEFwcENvbmZpZ1Jlc29sdmVyJywgJ1F1ZXJ5JywgJ2dldEFwcENvbmZpZycsIGRzQXBwQ29uZmlnLCAnZ2V0QXBwQ29uZmlnLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdBZG1pbkxpc3RVc2Vyc1Jlc29sdmVyJywgJ1F1ZXJ5JywgJ2FkbWluTGlzdFVzZXJzJywgZHNVc2VycywgJ2FkbWluTGlzdFVzZXJzLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdBZG1pbkdldFByb2ZpbGVSZXNvbHZlcicsICdRdWVyeScsICdhZG1pbkdldFByb2ZpbGUnLCBkc1VzZXJzLCAnYWRtaW5HZXRQcm9maWxlLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdVcHNlcnRQcm9ncmFtUmVzb2x2ZXInLCAnTXV0YXRpb24nLCAndXBzZXJ0UHJvZ3JhbScsIGRzUHJvZ3JhbXMsICd1cHNlcnRQcm9ncmFtLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdVcHNlcnRXZWVrbHlDb250ZW50UmVzb2x2ZXInLCAnTXV0YXRpb24nLCAndXBzZXJ0V2Vla2x5Q29udGVudCcsIGRzV2Vla2x5LCAndXBzZXJ0V2Vla2x5Q29udGVudC5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignVXBzZXJ0VGllckNhdGFsb2dSZXNvbHZlcicsICdNdXRhdGlvbicsICd1cHNlcnRUaWVyQ2F0YWxvZycsIGRzVGllckNhdGFsb2csICd1cHNlcnRUaWVyQ2F0YWxvZy5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignVXBzZXJ0QXBwQ29uZmlnUmVzb2x2ZXInLCAnTXV0YXRpb24nLCAndXBzZXJ0QXBwQ29uZmlnJywgZHNBcHBDb25maWcsICd1cHNlcnRBcHBDb25maWcuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1VwY29taW5nRXZlbnRzUmVzb2x2ZXInLCAnUXVlcnknLCAndXBjb21pbmdFdmVudHMnLCBkc0V2ZW50cywgJ3VwY29taW5nRXZlbnRzLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdSc3ZwRXZlbnRSZXNvbHZlcicsICdNdXRhdGlvbicsICdyc3ZwRXZlbnQnLCBkc0V2ZW50UnN2cHMsICdyc3ZwRXZlbnQuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0xpc3RQcm90ZWdlc1Jlc29sdmVyJywgJ1F1ZXJ5JywgJ2xpc3RQcm90ZWdlcycsIGRzQ29udGFjdCwgJ2xpc3RQcm90ZWdlcy5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignTGlzdEV2ZW50c0FkbWluUmVzb2x2ZXInLCAnUXVlcnknLCAnbGlzdEV2ZW50c0FkbWluJywgZHNFdmVudHMsICdsaXN0RXZlbnRzQWRtaW4uanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1VwZGF0ZUV2ZW50UmVjb3JkaW5nVXJsUmVzb2x2ZXInLCAnTXV0YXRpb24nLCAndXBkYXRlRXZlbnRSZWNvcmRpbmdVcmwnLCBkc0V2ZW50cywgJ3VwZGF0ZUV2ZW50UmVjb3JkaW5nVXJsLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdSZWNvcmRBZGhlcmVuY2VSZXNvbHZlcicsICdNdXRhdGlvbicsICdyZWNvcmRBZGhlcmVuY2UnLCBkc0FkaGVyZW5jZSwgJ3JlY29yZEFkaGVyZW5jZS5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignTGlzdE15QWRoZXJlbmNlUmVzb2x2ZXInLCAnUXVlcnknLCAnbGlzdE15QWRoZXJlbmNlJywgZHNBZGhlcmVuY2UsICdsaXN0TXlBZGhlcmVuY2UuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0xpc3RQYXRpZW50UmVjb3Jkc0FkbWluUmVzb2x2ZXInLCAnUXVlcnknLCAnbGlzdFBhdGllbnRSZWNvcmRzQWRtaW4nLCBkc1BhdGllbnRSZWNvcmRzLCAnbGlzdFBhdGllbnRSZWNvcmRzQWRtaW4uanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0dldFBhdGllbnRSZWNvcmRBZG1pblJlc29sdmVyJywgJ1F1ZXJ5JywgJ2dldFBhdGllbnRSZWNvcmRBZG1pbicsIGRzUGF0aWVudFJlY29yZHMsICdnZXRQYXRpZW50UmVjb3JkQWRtaW4uanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1VwZGF0ZUVuY291bnRlclN0YXRlQWRtaW5SZXNvbHZlcicsICdNdXRhdGlvbicsICd1cGRhdGVFbmNvdW50ZXJTdGF0ZUFkbWluJywgZHNQYXRpZW50UmVjb3JkcywgJ3VwZGF0ZUVuY291bnRlclN0YXRlQWRtaW4uanMnKTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdncmFwaHFsVXJsJywgeyB2YWx1ZTogdGhpcy5hcGkuZ3JhcGhxbFVybCB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnYXBpSWQnLCB7IHZhbHVlOiB0aGlzLmFwaS5hcGlJZCB9KTtcbiAgfVxufVxuIl19