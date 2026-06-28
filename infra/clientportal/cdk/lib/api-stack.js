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
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
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
        // ─── ChargeEncounterAdmin — Lambda data source ────────────────────────────
        const chargeFn = lambda.Function.fromFunctionName(this, 'ChargeOnApprovalFn', 'my4mlife-charge-on-approval');
        const dsCharge = this.api.addLambdaDataSource('ChargeOnApprovalDS', chargeFn);
        new appsync.Resolver(this, 'ChargeEncounterAdminResolver', {
            api: this.api,
            typeName: 'Mutation',
            fieldName: 'chargeEncounterAdmin',
            dataSource: dsCharge,
            runtime: JS_RUNTIME,
            code: code('chargeEncounterAdmin.js'),
        });
        // ─── ExportClinicalPacketAdmin — Lambda data source ───────────────────────
        const exportPacketFn = lambda.Function.fromFunctionName(this, 'ExportPacketFn', 'my4mlife-export-clinical-packet');
        const dsExportPacket = this.api.addLambdaDataSource('ExportClinicalPacketDS', exportPacketFn);
        new appsync.Resolver(this, 'ExportClinicalPacketAdminResolver', {
            api: this.api,
            typeName: 'Mutation',
            fieldName: 'exportClinicalPacketAdmin',
            dataSource: dsExportPacket,
            runtime: JS_RUNTIME,
            code: code('exportClinicalPacketAdmin.js'),
        });
        new cdk.CfnOutput(this, 'graphqlUrl', { value: this.api.graphqlUrl });
        new cdk.CfnOutput(this, 'apiId', { value: this.api.apiId });
    }
}
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3QixpREFBbUM7QUFFbkMsaUVBQW1EO0FBQ25ELGlFQUFtRDtBQUNuRCxtRUFBcUQ7QUFDckQsK0RBQWlEO0FBb0JqRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDOUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztBQUVsRixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQztBQUVwRCxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNyQixHQUFHLENBQXFCO0lBRXhDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsUUFBdUIsRUFBRTtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLFFBQVEsR0FDWixLQUFLLENBQUMsUUFBUTtZQUNkLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO2dCQUN6QyxZQUFZLEVBQUUsR0FBRyxFQUFFLFlBQVk7Z0JBQy9CLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87YUFDekMsQ0FBQyxDQUFDO1FBRUwsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFXLEVBQUUsSUFBWSxFQUFtQixFQUFFO1lBQy9ELE1BQU0sQ0FBQyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtnQkFDL0MsU0FB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UUFDdEUsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzlELENBQUM7Q0FDRjtBQWxORCw0QkFrTkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgYXBwc3luYyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBwc3luYyc7XG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBpU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgdXNlclBvb2w/OiBjb2duaXRvLklVc2VyUG9vbDtcbiAgdXNlcnNUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgZGlzY292ZXJ5UmVzcG9uc2VzVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIG91dGNvbWVzVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIGludGFrZUZvcm1zVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIHByb2dyYW1zVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIHdlZWtseUNvbnRlbnRUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgYWRtaW5RdWV1ZVRhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICBhcHBDb25maWdUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgdGllckNhdGFsb2dUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgY29udGFjdFRhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICBwYXRpZW50UmVjb3Jkc1RhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICBldmVudHNUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgZXZlbnRSc3Zwc1RhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICBhZGhlcmVuY2VUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbn1cblxuY29uc3QgUkVTT0xWRVJTX0RJUiA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdyZXNvbHZlcnMnKTtcbmNvbnN0IFNDSEVNQV9QQVRIID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ2FwcHN5bmMnLCAnc2NoZW1hLmdyYXBocWwnKTtcblxuY29uc3QgSlNfUlVOVElNRSA9IGFwcHN5bmMuRnVuY3Rpb25SdW50aW1lLkpTXzFfMF8wO1xuXG5leHBvcnQgY2xhc3MgQXBpU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgYXBpOiBhcHBzeW5jLkdyYXBocWxBcGk7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwaVN0YWNrUHJvcHMgPSB7fSkge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgdXNlclBvb2wgPVxuICAgICAgcHJvcHMudXNlclBvb2wgPz9cbiAgICAgIG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdTdHViVXNlclBvb2wnLCB7XG4gICAgICAgIHVzZXJQb29sTmFtZTogYCR7aWR9LXN0dWItcG9vbGAsXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJPd25lZCA9IChrZXk6IHN0cmluZywgbmFtZTogc3RyaW5nKTogZHluYW1vZGIuSVRhYmxlID0+IHtcbiAgICAgIGNvbnN0IHQgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgYFN0dWIke2tleX1gLCB7XG4gICAgICAgIHRhYmxlTmFtZTogYCR7aWR9LSR7bmFtZX1gLFxuICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuICAgICAgdC5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICAgIGluZGV4TmFtZTogJ2J5T3duZXInLFxuICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ293bmVyJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHQ7XG4gICAgfTtcbiAgICBjb25zdCBzaW1wbGUgPSAoa2V5OiBzdHJpbmcsIG5hbWU6IHN0cmluZywgcGsgPSAnaWQnKTogZHluYW1vZGIuSVRhYmxlID0+XG4gICAgICBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgYFN0dWIke2tleX1gLCB7XG4gICAgICAgIHRhYmxlTmFtZTogYCR7aWR9LSR7bmFtZX1gLFxuICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogcGssIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJzVGFibGUgPSBwcm9wcy51c2Vyc1RhYmxlID8/IHVzZXJPd25lZCgnVXNlcnMnLCAnVXNlcnMnKTtcbiAgICBjb25zdCBkaXNjb3ZlcnlUYWJsZSA9XG4gICAgICBwcm9wcy5kaXNjb3ZlcnlSZXNwb25zZXNUYWJsZSA/PyB1c2VyT3duZWQoJ0Rpc2NvdmVyeScsICdEaXNjb3ZlcnlSZXNwb25zZXMnKTtcbiAgICBjb25zdCBvdXRjb21lc1RhYmxlID0gcHJvcHMub3V0Y29tZXNUYWJsZSA/PyB1c2VyT3duZWQoJ091dGNvbWVzJywgJ091dGNvbWVzJyk7XG4gICAgY29uc3QgaW50YWtlVGFibGUgPVxuICAgICAgcHJvcHMuaW50YWtlRm9ybXNUYWJsZSA/PyB1c2VyT3duZWQoJ0ludGFrZScsICdJbnRha2VGb3JtcycpO1xuICAgIGNvbnN0IHByb2dyYW1zVGFibGUgPSBwcm9wcy5wcm9ncmFtc1RhYmxlID8/IHNpbXBsZSgnUHJvZ3JhbXMnLCAnUHJvZ3JhbXMnKTtcbiAgICBjb25zdCB3ZWVrbHlUYWJsZSA9XG4gICAgICBwcm9wcy53ZWVrbHlDb250ZW50VGFibGUgPz8gc2ltcGxlKCdXZWVrbHlDb250ZW50JywgJ1dlZWtseUNvbnRlbnQnKTtcbiAgICBjb25zdCBhZG1pblF1ZXVlVGFibGUgPVxuICAgICAgcHJvcHMuYWRtaW5RdWV1ZVRhYmxlID8/IHNpbXBsZSgnQWRtaW5RdWV1ZScsICdBZG1pblF1ZXVlJyk7XG4gICAgY29uc3QgYXBwQ29uZmlnVGFibGUgPVxuICAgICAgcHJvcHMuYXBwQ29uZmlnVGFibGUgPz8gc2ltcGxlKCdBcHBDb25maWcnLCAnQXBwQ29uZmlnJywgJ2tleScpO1xuICAgIGNvbnN0IHRpZXJDYXRhbG9nVGFibGUgPVxuICAgICAgcHJvcHMudGllckNhdGFsb2dUYWJsZSA/PyBzaW1wbGUoJ1RpZXJDYXRhbG9nJywgJ1RpZXJDYXRhbG9nJyk7XG4gICAgY29uc3QgZXZlbnRzVGFibGUgPVxuICAgICAgcHJvcHMuZXZlbnRzVGFibGUgPz8gc2ltcGxlKCdFdmVudHMnLCAnRXZlbnRzJywgJ2V2ZW50SWQnKTtcbiAgICBjb25zdCBldmVudFJzdnBzVGFibGUgPVxuICAgICAgcHJvcHMuZXZlbnRSc3Zwc1RhYmxlID8/IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnU3R1YkV2ZW50UnN2cHMnLCB7XG4gICAgICAgIHRhYmxlTmFtZTogYCR7aWR9LUV2ZW50UlNWUHNgLFxuICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2V2ZW50SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjb250YWN0SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgfSk7XG4gICAgY29uc3QgYWRoZXJlbmNlVGFibGUgPVxuICAgICAgcHJvcHMuYWRoZXJlbmNlVGFibGUgPz8gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdTdHViQWRoZXJlbmNlJywge1xuICAgICAgICB0YWJsZU5hbWU6IGAke2lkfS1BZGhlcmVuY2VgLFxuICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2RhdGVBY3Rpb25JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB9KTtcblxuICAgIHRoaXMuYXBpID0gbmV3IGFwcHN5bmMuR3JhcGhxbEFwaSh0aGlzLCAnQXBpJywge1xuICAgICAgbmFtZTogJ2NsaWVudHBvcnRhbC1hcGknLFxuICAgICAgZGVmaW5pdGlvbjogYXBwc3luYy5EZWZpbml0aW9uLmZyb21GaWxlKFNDSEVNQV9QQVRIKSxcbiAgICAgIGF1dGhvcml6YXRpb25Db25maWc6IHtcbiAgICAgICAgZGVmYXVsdEF1dGhvcml6YXRpb246IHtcbiAgICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBwc3luYy5BdXRob3JpemF0aW9uVHlwZS5VU0VSX1BPT0wsXG4gICAgICAgICAgdXNlclBvb2xDb25maWc6IHsgdXNlclBvb2wgfSxcbiAgICAgICAgfSxcbiAgICAgICAgYWRkaXRpb25hbEF1dGhvcml6YXRpb25Nb2RlczogW1xuICAgICAgICAgIHsgYXV0aG9yaXphdGlvblR5cGU6IGFwcHN5bmMuQXV0aG9yaXphdGlvblR5cGUuSUFNIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAgeHJheUVuYWJsZWQ6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgY29uc3QgZHNVc2VycyA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnVXNlcnNEUycsIHVzZXJzVGFibGUpO1xuICAgIGNvbnN0IGRzT3V0Y29tZXMgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ091dGNvbWVzRFMnLCBvdXRjb21lc1RhYmxlKTtcbiAgICBjb25zdCBkc0FwcENvbmZpZyA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnQXBwQ29uZmlnRFMnLCBhcHBDb25maWdUYWJsZSk7XG4gICAgY29uc3QgZHNQcm9ncmFtcyA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnUHJvZ3JhbXNEUycsIHByb2dyYW1zVGFibGUpO1xuICAgIGNvbnN0IGRzV2Vla2x5ID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdXZWVrbHlEUycsIHdlZWtseVRhYmxlKTtcbiAgICBjb25zdCBkc1RpZXJDYXRhbG9nID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdUaWVyQ2F0YWxvZ0RTJywgdGllckNhdGFsb2dUYWJsZSk7XG4gICAgdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdEaXNjb3ZlcnlEUycsIGRpc2NvdmVyeVRhYmxlKTtcbiAgICB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ0ludGFrZURTJywgaW50YWtlVGFibGUpO1xuICAgIHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnQWRtaW5RdWV1ZURTJywgYWRtaW5RdWV1ZVRhYmxlKTtcbiAgICBjb25zdCBjb250YWN0VGFibGUgPVxuICAgICAgcHJvcHMuY29udGFjdFRhYmxlID8/XG4gICAgICBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1N0dWJDb250YWN0Jywge1xuICAgICAgICB0YWJsZU5hbWU6IGAke2lkfS1Db250YWN0YCxcbiAgICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdjb250YWN0SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgfSk7XG4gICAgY29uc3QgZHNDb250YWN0ID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdDb250YWN0RFMnLCBjb250YWN0VGFibGUpO1xuXG4gICAgY29uc3QgcGF0aWVudFJlY29yZHNUYWJsZSA9XG4gICAgICBwcm9wcy5wYXRpZW50UmVjb3Jkc1RhYmxlID8/XG4gICAgICBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1N0dWJQYXRpZW50UmVjb3JkcycsIHtcbiAgICAgICAgdGFibGVOYW1lOiBgJHtpZH0tUGF0aWVudFJlY29yZHNgLFxuICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2NvbnRhY3RJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3NrJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuICAgIGNvbnN0IGRzUGF0aWVudFJlY29yZHMgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ1BhdGllbnRSZWNvcmRzRFMnLCBwYXRpZW50UmVjb3Jkc1RhYmxlKTtcblxuICAgIGNvbnN0IGRzRXZlbnRzID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdFdmVudHNEUycsIGV2ZW50c1RhYmxlKTtcbiAgICBjb25zdCBkc0V2ZW50UnN2cHMgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ0V2ZW50UnN2cHNEUycsIGV2ZW50UnN2cHNUYWJsZSk7XG4gICAgY29uc3QgZHNBZGhlcmVuY2UgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ0FkaGVyZW5jZURTJywgYWRoZXJlbmNlVGFibGUpO1xuXG4gICAgY29uc3QgY29kZSA9IChmaWxlOiBzdHJpbmcpID0+XG4gICAgICBhcHBzeW5jLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihSRVNPTFZFUlNfRElSLCBmaWxlKSk7XG5cbiAgICAvLyBnZXRNeVByb2ZpbGUgcGlwZWxpbmUgKGF1dG8tY3JlYXRlIG9uIG1pc3NpbmcpXG4gICAgY29uc3QgZ2V0Rm4gPSBuZXcgYXBwc3luYy5BcHBzeW5jRnVuY3Rpb24odGhpcywgJ0dldFByb2ZpbGVGbicsIHtcbiAgICAgIGFwaTogdGhpcy5hcGksXG4gICAgICBkYXRhU291cmNlOiBkc1VzZXJzLFxuICAgICAgbmFtZTogJ2dldFByb2ZpbGVGbicsXG4gICAgICBydW50aW1lOiBKU19SVU5USU1FLFxuICAgICAgY29kZTogY29kZSgnZ2V0TXlQcm9maWxlLmdldC5qcycpLFxuICAgIH0pO1xuICAgIGNvbnN0IGNyZWF0ZUZuID0gbmV3IGFwcHN5bmMuQXBwc3luY0Z1bmN0aW9uKHRoaXMsICdDcmVhdGVQcm9maWxlRm4nLCB7XG4gICAgICBhcGk6IHRoaXMuYXBpLFxuICAgICAgZGF0YVNvdXJjZTogZHNVc2VycyxcbiAgICAgIG5hbWU6ICdjcmVhdGVQcm9maWxlRm4nLFxuICAgICAgcnVudGltZTogSlNfUlVOVElNRSxcbiAgICAgIGNvZGU6IGNvZGUoJ2dldE15UHJvZmlsZS5jcmVhdGUuanMnKSxcbiAgICB9KTtcbiAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCAnR2V0TXlQcm9maWxlUmVzb2x2ZXInLCB7XG4gICAgICBhcGk6IHRoaXMuYXBpLFxuICAgICAgdHlwZU5hbWU6ICdRdWVyeScsXG4gICAgICBmaWVsZE5hbWU6ICdnZXRNeVByb2ZpbGUnLFxuICAgICAgcnVudGltZTogSlNfUlVOVElNRSxcbiAgICAgIGNvZGU6IGNvZGUoJ2dldE15UHJvZmlsZS5waXBlbGluZS5qcycpLFxuICAgICAgcGlwZWxpbmVDb25maWc6IFtnZXRGbiwgY3JlYXRlRm5dLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdW5pdFJlc29sdmVyID0gKFxuICAgICAgaWRTdHI6IHN0cmluZyxcbiAgICAgIHR5cGVOYW1lOiBzdHJpbmcsXG4gICAgICBmaWVsZE5hbWU6IHN0cmluZyxcbiAgICAgIGRzOiBhcHBzeW5jLkR5bmFtb0RiRGF0YVNvdXJjZSxcbiAgICAgIGZpbGU6IHN0cmluZyxcbiAgICApID0+XG4gICAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCBpZFN0ciwge1xuICAgICAgICBhcGk6IHRoaXMuYXBpLFxuICAgICAgICB0eXBlTmFtZSxcbiAgICAgICAgZmllbGROYW1lLFxuICAgICAgICBkYXRhU291cmNlOiBkcyxcbiAgICAgICAgcnVudGltZTogSlNfUlVOVElNRSxcbiAgICAgICAgY29kZTogY29kZShmaWxlKSxcbiAgICAgIH0pO1xuXG4gICAgdW5pdFJlc29sdmVyKCdVcHNlcnRQcm9maWxlUmVzb2x2ZXInLCAnTXV0YXRpb24nLCAndXBzZXJ0TXlQcm9maWxlJywgZHNVc2VycywgJ3Vwc2VydE15UHJvZmlsZS5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignVXBkYXRlU2Vjb25kYXJ5RW1haWxSZXNvbHZlcicsICdNdXRhdGlvbicsICd1cGRhdGVTZWNvbmRhcnlFbWFpbCcsIGRzVXNlcnMsICd1cGRhdGVTZWNvbmRhcnlFbWFpbC5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignTGlzdE15T3V0Y29tZXNSZXNvbHZlcicsICdRdWVyeScsICdsaXN0TXlPdXRjb21lcycsIGRzT3V0Y29tZXMsICdsaXN0TXlPdXRjb21lcy5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignQ3JlYXRlT3V0Y29tZVJlc29sdmVyJywgJ011dGF0aW9uJywgJ2NyZWF0ZU91dGNvbWUnLCBkc091dGNvbWVzLCAnY3JlYXRlT3V0Y29tZS5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignR2V0QXBwQ29uZmlnUmVzb2x2ZXInLCAnUXVlcnknLCAnZ2V0QXBwQ29uZmlnJywgZHNBcHBDb25maWcsICdnZXRBcHBDb25maWcuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0FkbWluTGlzdFVzZXJzUmVzb2x2ZXInLCAnUXVlcnknLCAnYWRtaW5MaXN0VXNlcnMnLCBkc1VzZXJzLCAnYWRtaW5MaXN0VXNlcnMuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0FkbWluR2V0UHJvZmlsZVJlc29sdmVyJywgJ1F1ZXJ5JywgJ2FkbWluR2V0UHJvZmlsZScsIGRzVXNlcnMsICdhZG1pbkdldFByb2ZpbGUuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1Vwc2VydFByb2dyYW1SZXNvbHZlcicsICdNdXRhdGlvbicsICd1cHNlcnRQcm9ncmFtJywgZHNQcm9ncmFtcywgJ3Vwc2VydFByb2dyYW0uanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1Vwc2VydFdlZWtseUNvbnRlbnRSZXNvbHZlcicsICdNdXRhdGlvbicsICd1cHNlcnRXZWVrbHlDb250ZW50JywgZHNXZWVrbHksICd1cHNlcnRXZWVrbHlDb250ZW50LmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdVcHNlcnRUaWVyQ2F0YWxvZ1Jlc29sdmVyJywgJ011dGF0aW9uJywgJ3Vwc2VydFRpZXJDYXRhbG9nJywgZHNUaWVyQ2F0YWxvZywgJ3Vwc2VydFRpZXJDYXRhbG9nLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdVcHNlcnRBcHBDb25maWdSZXNvbHZlcicsICdNdXRhdGlvbicsICd1cHNlcnRBcHBDb25maWcnLCBkc0FwcENvbmZpZywgJ3Vwc2VydEFwcENvbmZpZy5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignVXBjb21pbmdFdmVudHNSZXNvbHZlcicsICdRdWVyeScsICd1cGNvbWluZ0V2ZW50cycsIGRzRXZlbnRzLCAndXBjb21pbmdFdmVudHMuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1JzdnBFdmVudFJlc29sdmVyJywgJ011dGF0aW9uJywgJ3JzdnBFdmVudCcsIGRzRXZlbnRSc3ZwcywgJ3JzdnBFdmVudC5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignTGlzdFByb3RlZ2VzUmVzb2x2ZXInLCAnUXVlcnknLCAnbGlzdFByb3RlZ2VzJywgZHNDb250YWN0LCAnbGlzdFByb3RlZ2VzLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdMaXN0RXZlbnRzQWRtaW5SZXNvbHZlcicsICdRdWVyeScsICdsaXN0RXZlbnRzQWRtaW4nLCBkc0V2ZW50cywgJ2xpc3RFdmVudHNBZG1pbi5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignVXBkYXRlRXZlbnRSZWNvcmRpbmdVcmxSZXNvbHZlcicsICdNdXRhdGlvbicsICd1cGRhdGVFdmVudFJlY29yZGluZ1VybCcsIGRzRXZlbnRzLCAndXBkYXRlRXZlbnRSZWNvcmRpbmdVcmwuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1JlY29yZEFkaGVyZW5jZVJlc29sdmVyJywgJ011dGF0aW9uJywgJ3JlY29yZEFkaGVyZW5jZScsIGRzQWRoZXJlbmNlLCAncmVjb3JkQWRoZXJlbmNlLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdMaXN0TXlBZGhlcmVuY2VSZXNvbHZlcicsICdRdWVyeScsICdsaXN0TXlBZGhlcmVuY2UnLCBkc0FkaGVyZW5jZSwgJ2xpc3RNeUFkaGVyZW5jZS5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignTGlzdFBhdGllbnRSZWNvcmRzQWRtaW5SZXNvbHZlcicsICdRdWVyeScsICdsaXN0UGF0aWVudFJlY29yZHNBZG1pbicsIGRzUGF0aWVudFJlY29yZHMsICdsaXN0UGF0aWVudFJlY29yZHNBZG1pbi5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignR2V0UGF0aWVudFJlY29yZEFkbWluUmVzb2x2ZXInLCAnUXVlcnknLCAnZ2V0UGF0aWVudFJlY29yZEFkbWluJywgZHNQYXRpZW50UmVjb3JkcywgJ2dldFBhdGllbnRSZWNvcmRBZG1pbi5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignVXBkYXRlRW5jb3VudGVyU3RhdGVBZG1pblJlc29sdmVyJywgJ011dGF0aW9uJywgJ3VwZGF0ZUVuY291bnRlclN0YXRlQWRtaW4nLCBkc1BhdGllbnRSZWNvcmRzLCAndXBkYXRlRW5jb3VudGVyU3RhdGVBZG1pbi5qcycpO1xuXG4gICAgLy8g4pSA4pSA4pSAIENoYXJnZUVuY291bnRlckFkbWluIOKAlCBMYW1iZGEgZGF0YSBzb3VyY2Ug4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4gICAgY29uc3QgY2hhcmdlRm4gPSBsYW1iZGEuRnVuY3Rpb24uZnJvbUZ1bmN0aW9uTmFtZSh0aGlzLCAnQ2hhcmdlT25BcHByb3ZhbEZuJywgJ215NG1saWZlLWNoYXJnZS1vbi1hcHByb3ZhbCcpO1xuICAgIGNvbnN0IGRzQ2hhcmdlID0gdGhpcy5hcGkuYWRkTGFtYmRhRGF0YVNvdXJjZSgnQ2hhcmdlT25BcHByb3ZhbERTJywgY2hhcmdlRm4pO1xuICAgIG5ldyBhcHBzeW5jLlJlc29sdmVyKHRoaXMsICdDaGFyZ2VFbmNvdW50ZXJBZG1pblJlc29sdmVyJywge1xuICAgICAgYXBpOiB0aGlzLmFwaSxcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnY2hhcmdlRW5jb3VudGVyQWRtaW4nLFxuICAgICAgZGF0YVNvdXJjZTogZHNDaGFyZ2UsXG4gICAgICBydW50aW1lOiBKU19SVU5USU1FLFxuICAgICAgY29kZTogY29kZSgnY2hhcmdlRW5jb3VudGVyQWRtaW4uanMnKSxcbiAgICB9KTtcblxuICAgIC8vIOKUgOKUgOKUgCBFeHBvcnRDbGluaWNhbFBhY2tldEFkbWluIOKAlCBMYW1iZGEgZGF0YSBzb3VyY2Ug4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4gICAgY29uc3QgZXhwb3J0UGFja2V0Rm4gPSBsYW1iZGEuRnVuY3Rpb24uZnJvbUZ1bmN0aW9uTmFtZSh0aGlzLCAnRXhwb3J0UGFja2V0Rm4nLCAnbXk0bWxpZmUtZXhwb3J0LWNsaW5pY2FsLXBhY2tldCcpO1xuICAgIGNvbnN0IGRzRXhwb3J0UGFja2V0ID0gdGhpcy5hcGkuYWRkTGFtYmRhRGF0YVNvdXJjZSgnRXhwb3J0Q2xpbmljYWxQYWNrZXREUycsIGV4cG9ydFBhY2tldEZuKTtcbiAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCAnRXhwb3J0Q2xpbmljYWxQYWNrZXRBZG1pblJlc29sdmVyJywge1xuICAgICAgYXBpOiB0aGlzLmFwaSxcbiAgICAgIHR5cGVOYW1lOiAnTXV0YXRpb24nLFxuICAgICAgZmllbGROYW1lOiAnZXhwb3J0Q2xpbmljYWxQYWNrZXRBZG1pbicsXG4gICAgICBkYXRhU291cmNlOiBkc0V4cG9ydFBhY2tldCxcbiAgICAgIHJ1bnRpbWU6IEpTX1JVTlRJTUUsXG4gICAgICBjb2RlOiBjb2RlKCdleHBvcnRDbGluaWNhbFBhY2tldEFkbWluLmpzJyksXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnZ3JhcGhxbFVybCcsIHsgdmFsdWU6IHRoaXMuYXBpLmdyYXBocWxVcmwgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ2FwaUlkJywgeyB2YWx1ZTogdGhpcy5hcGkuYXBpSWQgfSk7XG4gIH1cbn1cbiJdfQ==