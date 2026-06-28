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
            logConfig: {
                // ERROR-only + no verbose content: capture failures without writing
                // patient PHI (request/response payloads) into CloudWatch. Bump to ALL
                // + excludeVerboseContent:false temporarily when actively debugging.
                fieldLogLevel: appsync.FieldLogLevel.ERROR,
                excludeVerboseContent: true,
            },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3QixpREFBbUM7QUFFbkMsaUVBQW1EO0FBQ25ELGlFQUFtRDtBQUNuRCxtRUFBcUQ7QUFDckQsK0RBQWlEO0FBb0JqRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDOUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztBQUVsRixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQztBQUVwRCxNQUFhLFFBQVMsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNyQixHQUFHLENBQXFCO0lBRXhDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsUUFBdUIsRUFBRTtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLFFBQVEsR0FDWixLQUFLLENBQUMsUUFBUTtZQUNkLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO2dCQUN6QyxZQUFZLEVBQUUsR0FBRyxFQUFFLFlBQVk7Z0JBQy9CLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87YUFDekMsQ0FBQyxDQUFDO1FBRUwsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFXLEVBQUUsSUFBWSxFQUFtQixFQUFFO1lBQy9ELE1BQU0sQ0FBQyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRTtnQkFDL0MsU0FB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QixDQUFDO1NBQzNDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUN0RSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDOUQsQ0FBQztDQUNGO0FBek5ELDRCQXlOQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBhcHBzeW5jIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcHBzeW5jJztcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcblxuZXhwb3J0IGludGVyZmFjZSBBcGlTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICB1c2VyUG9vbD86IGNvZ25pdG8uSVVzZXJQb29sO1xuICB1c2Vyc1RhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICBkaXNjb3ZlcnlSZXNwb25zZXNUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgb3V0Y29tZXNUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgaW50YWtlRm9ybXNUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgcHJvZ3JhbXNUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgd2Vla2x5Q29udGVudFRhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICBhZG1pblF1ZXVlVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIGFwcENvbmZpZ1RhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICB0aWVyQ2F0YWxvZ1RhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICBjb250YWN0VGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIHBhdGllbnRSZWNvcmRzVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIGV2ZW50c1RhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICBldmVudFJzdnBzVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIGFkaGVyZW5jZVRhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xufVxuXG5jb25zdCBSRVNPTFZFUlNfRElSID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ3Jlc29sdmVycycpO1xuY29uc3QgU0NIRU1BX1BBVEggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAnYXBwc3luYycsICdzY2hlbWEuZ3JhcGhxbCcpO1xuXG5jb25zdCBKU19SVU5USU1FID0gYXBwc3luYy5GdW5jdGlvblJ1bnRpbWUuSlNfMV8wXzA7XG5cbmV4cG9ydCBjbGFzcyBBcGlTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBhcGk6IGFwcHN5bmMuR3JhcGhxbEFwaTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXBpU3RhY2tQcm9wcyA9IHt9KSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB1c2VyUG9vbCA9XG4gICAgICBwcm9wcy51c2VyUG9vbCA/P1xuICAgICAgbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1N0dWJVc2VyUG9vbCcsIHtcbiAgICAgICAgdXNlclBvb2xOYW1lOiBgJHtpZH0tc3R1Yi1wb29sYCxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuXG4gICAgY29uc3QgdXNlck93bmVkID0gKGtleTogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBkeW5hbW9kYi5JVGFibGUgPT4ge1xuICAgICAgY29uc3QgdCA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBgU3R1YiR7a2V5fWAsIHtcbiAgICAgICAgdGFibGVOYW1lOiBgJHtpZH0tJHtuYW1lfWAsXG4gICAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgfSk7XG4gICAgICB0LmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgICAgaW5kZXhOYW1lOiAnYnlPd25lcicsXG4gICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnb3duZXInLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdDtcbiAgICB9O1xuICAgIGNvbnN0IHNpbXBsZSA9IChrZXk6IHN0cmluZywgbmFtZTogc3RyaW5nLCBwayA9ICdpZCcpOiBkeW5hbW9kYi5JVGFibGUgPT5cbiAgICAgIG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCBgU3R1YiR7a2V5fWAsIHtcbiAgICAgICAgdGFibGVOYW1lOiBgJHtpZH0tJHtuYW1lfWAsXG4gICAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiBwaywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuXG4gICAgY29uc3QgdXNlcnNUYWJsZSA9IHByb3BzLnVzZXJzVGFibGUgPz8gdXNlck93bmVkKCdVc2VycycsICdVc2VycycpO1xuICAgIGNvbnN0IGRpc2NvdmVyeVRhYmxlID1cbiAgICAgIHByb3BzLmRpc2NvdmVyeVJlc3BvbnNlc1RhYmxlID8/IHVzZXJPd25lZCgnRGlzY292ZXJ5JywgJ0Rpc2NvdmVyeVJlc3BvbnNlcycpO1xuICAgIGNvbnN0IG91dGNvbWVzVGFibGUgPSBwcm9wcy5vdXRjb21lc1RhYmxlID8/IHVzZXJPd25lZCgnT3V0Y29tZXMnLCAnT3V0Y29tZXMnKTtcbiAgICBjb25zdCBpbnRha2VUYWJsZSA9XG4gICAgICBwcm9wcy5pbnRha2VGb3Jtc1RhYmxlID8/IHVzZXJPd25lZCgnSW50YWtlJywgJ0ludGFrZUZvcm1zJyk7XG4gICAgY29uc3QgcHJvZ3JhbXNUYWJsZSA9IHByb3BzLnByb2dyYW1zVGFibGUgPz8gc2ltcGxlKCdQcm9ncmFtcycsICdQcm9ncmFtcycpO1xuICAgIGNvbnN0IHdlZWtseVRhYmxlID1cbiAgICAgIHByb3BzLndlZWtseUNvbnRlbnRUYWJsZSA/PyBzaW1wbGUoJ1dlZWtseUNvbnRlbnQnLCAnV2Vla2x5Q29udGVudCcpO1xuICAgIGNvbnN0IGFkbWluUXVldWVUYWJsZSA9XG4gICAgICBwcm9wcy5hZG1pblF1ZXVlVGFibGUgPz8gc2ltcGxlKCdBZG1pblF1ZXVlJywgJ0FkbWluUXVldWUnKTtcbiAgICBjb25zdCBhcHBDb25maWdUYWJsZSA9XG4gICAgICBwcm9wcy5hcHBDb25maWdUYWJsZSA/PyBzaW1wbGUoJ0FwcENvbmZpZycsICdBcHBDb25maWcnLCAna2V5Jyk7XG4gICAgY29uc3QgdGllckNhdGFsb2dUYWJsZSA9XG4gICAgICBwcm9wcy50aWVyQ2F0YWxvZ1RhYmxlID8/IHNpbXBsZSgnVGllckNhdGFsb2cnLCAnVGllckNhdGFsb2cnKTtcbiAgICBjb25zdCBldmVudHNUYWJsZSA9XG4gICAgICBwcm9wcy5ldmVudHNUYWJsZSA/PyBzaW1wbGUoJ0V2ZW50cycsICdFdmVudHMnLCAnZXZlbnRJZCcpO1xuICAgIGNvbnN0IGV2ZW50UnN2cHNUYWJsZSA9XG4gICAgICBwcm9wcy5ldmVudFJzdnBzVGFibGUgPz8gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdTdHViRXZlbnRSc3ZwcycsIHtcbiAgICAgICAgdGFibGVOYW1lOiBgJHtpZH0tRXZlbnRSU1ZQc2AsXG4gICAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZXZlbnRJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NvbnRhY3RJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB9KTtcbiAgICBjb25zdCBhZGhlcmVuY2VUYWJsZSA9XG4gICAgICBwcm9wcy5hZGhlcmVuY2VUYWJsZSA/PyBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1N0dWJBZGhlcmVuY2UnLCB7XG4gICAgICAgIHRhYmxlTmFtZTogYCR7aWR9LUFkaGVyZW5jZWAsXG4gICAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgc29ydEtleTogeyBuYW1lOiAnZGF0ZUFjdGlvbklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuXG4gICAgdGhpcy5hcGkgPSBuZXcgYXBwc3luYy5HcmFwaHFsQXBpKHRoaXMsICdBcGknLCB7XG4gICAgICBuYW1lOiAnY2xpZW50cG9ydGFsLWFwaScsXG4gICAgICBkZWZpbml0aW9uOiBhcHBzeW5jLkRlZmluaXRpb24uZnJvbUZpbGUoU0NIRU1BX1BBVEgpLFxuICAgICAgYXV0aG9yaXphdGlvbkNvbmZpZzoge1xuICAgICAgICBkZWZhdWx0QXV0aG9yaXphdGlvbjoge1xuICAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcHBzeW5jLkF1dGhvcml6YXRpb25UeXBlLlVTRVJfUE9PTCxcbiAgICAgICAgICB1c2VyUG9vbENvbmZpZzogeyB1c2VyUG9vbCB9LFxuICAgICAgICB9LFxuICAgICAgICBhZGRpdGlvbmFsQXV0aG9yaXphdGlvbk1vZGVzOiBbXG4gICAgICAgICAgeyBhdXRob3JpemF0aW9uVHlwZTogYXBwc3luYy5BdXRob3JpemF0aW9uVHlwZS5JQU0gfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB4cmF5RW5hYmxlZDogZmFsc2UsXG4gICAgICBsb2dDb25maWc6IHtcbiAgICAgICAgLy8gRVJST1Itb25seSArIG5vIHZlcmJvc2UgY29udGVudDogY2FwdHVyZSBmYWlsdXJlcyB3aXRob3V0IHdyaXRpbmdcbiAgICAgICAgLy8gcGF0aWVudCBQSEkgKHJlcXVlc3QvcmVzcG9uc2UgcGF5bG9hZHMpIGludG8gQ2xvdWRXYXRjaC4gQnVtcCB0byBBTExcbiAgICAgICAgLy8gKyBleGNsdWRlVmVyYm9zZUNvbnRlbnQ6ZmFsc2UgdGVtcG9yYXJpbHkgd2hlbiBhY3RpdmVseSBkZWJ1Z2dpbmcuXG4gICAgICAgIGZpZWxkTG9nTGV2ZWw6IGFwcHN5bmMuRmllbGRMb2dMZXZlbC5FUlJPUixcbiAgICAgICAgZXhjbHVkZVZlcmJvc2VDb250ZW50OiB0cnVlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGRzVXNlcnMgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ1VzZXJzRFMnLCB1c2Vyc1RhYmxlKTtcbiAgICBjb25zdCBkc091dGNvbWVzID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdPdXRjb21lc0RTJywgb3V0Y29tZXNUYWJsZSk7XG4gICAgY29uc3QgZHNBcHBDb25maWcgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ0FwcENvbmZpZ0RTJywgYXBwQ29uZmlnVGFibGUpO1xuICAgIGNvbnN0IGRzUHJvZ3JhbXMgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ1Byb2dyYW1zRFMnLCBwcm9ncmFtc1RhYmxlKTtcbiAgICBjb25zdCBkc1dlZWtseSA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnV2Vla2x5RFMnLCB3ZWVrbHlUYWJsZSk7XG4gICAgY29uc3QgZHNUaWVyQ2F0YWxvZyA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnVGllckNhdGFsb2dEUycsIHRpZXJDYXRhbG9nVGFibGUpO1xuICAgIHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnRGlzY292ZXJ5RFMnLCBkaXNjb3ZlcnlUYWJsZSk7XG4gICAgdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdJbnRha2VEUycsIGludGFrZVRhYmxlKTtcbiAgICB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ0FkbWluUXVldWVEUycsIGFkbWluUXVldWVUYWJsZSk7XG4gICAgY29uc3QgY29udGFjdFRhYmxlID1cbiAgICAgIHByb3BzLmNvbnRhY3RUYWJsZSA/P1xuICAgICAgbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdTdHViQ29udGFjdCcsIHtcbiAgICAgICAgdGFibGVOYW1lOiBgJHtpZH0tQ29udGFjdGAsXG4gICAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnY29udGFjdElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuICAgIGNvbnN0IGRzQ29udGFjdCA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnQ29udGFjdERTJywgY29udGFjdFRhYmxlKTtcblxuICAgIGNvbnN0IHBhdGllbnRSZWNvcmRzVGFibGUgPVxuICAgICAgcHJvcHMucGF0aWVudFJlY29yZHNUYWJsZSA/P1xuICAgICAgbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdTdHViUGF0aWVudFJlY29yZHMnLCB7XG4gICAgICAgIHRhYmxlTmFtZTogYCR7aWR9LVBhdGllbnRSZWNvcmRzYCxcbiAgICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdjb250YWN0SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICdzaycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB9KTtcbiAgICBjb25zdCBkc1BhdGllbnRSZWNvcmRzID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdQYXRpZW50UmVjb3Jkc0RTJywgcGF0aWVudFJlY29yZHNUYWJsZSk7XG5cbiAgICBjb25zdCBkc0V2ZW50cyA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnRXZlbnRzRFMnLCBldmVudHNUYWJsZSk7XG4gICAgY29uc3QgZHNFdmVudFJzdnBzID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdFdmVudFJzdnBzRFMnLCBldmVudFJzdnBzVGFibGUpO1xuICAgIGNvbnN0IGRzQWRoZXJlbmNlID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdBZGhlcmVuY2VEUycsIGFkaGVyZW5jZVRhYmxlKTtcblxuICAgIGNvbnN0IGNvZGUgPSAoZmlsZTogc3RyaW5nKSA9PlxuICAgICAgYXBwc3luYy5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oUkVTT0xWRVJTX0RJUiwgZmlsZSkpO1xuXG4gICAgLy8gZ2V0TXlQcm9maWxlIHBpcGVsaW5lIChhdXRvLWNyZWF0ZSBvbiBtaXNzaW5nKVxuICAgIGNvbnN0IGdldEZuID0gbmV3IGFwcHN5bmMuQXBwc3luY0Z1bmN0aW9uKHRoaXMsICdHZXRQcm9maWxlRm4nLCB7XG4gICAgICBhcGk6IHRoaXMuYXBpLFxuICAgICAgZGF0YVNvdXJjZTogZHNVc2VycyxcbiAgICAgIG5hbWU6ICdnZXRQcm9maWxlRm4nLFxuICAgICAgcnVudGltZTogSlNfUlVOVElNRSxcbiAgICAgIGNvZGU6IGNvZGUoJ2dldE15UHJvZmlsZS5nZXQuanMnKSxcbiAgICB9KTtcbiAgICBjb25zdCBjcmVhdGVGbiA9IG5ldyBhcHBzeW5jLkFwcHN5bmNGdW5jdGlvbih0aGlzLCAnQ3JlYXRlUHJvZmlsZUZuJywge1xuICAgICAgYXBpOiB0aGlzLmFwaSxcbiAgICAgIGRhdGFTb3VyY2U6IGRzVXNlcnMsXG4gICAgICBuYW1lOiAnY3JlYXRlUHJvZmlsZUZuJyxcbiAgICAgIHJ1bnRpbWU6IEpTX1JVTlRJTUUsXG4gICAgICBjb2RlOiBjb2RlKCdnZXRNeVByb2ZpbGUuY3JlYXRlLmpzJyksXG4gICAgfSk7XG4gICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgJ0dldE15UHJvZmlsZVJlc29sdmVyJywge1xuICAgICAgYXBpOiB0aGlzLmFwaSxcbiAgICAgIHR5cGVOYW1lOiAnUXVlcnknLFxuICAgICAgZmllbGROYW1lOiAnZ2V0TXlQcm9maWxlJyxcbiAgICAgIHJ1bnRpbWU6IEpTX1JVTlRJTUUsXG4gICAgICBjb2RlOiBjb2RlKCdnZXRNeVByb2ZpbGUucGlwZWxpbmUuanMnKSxcbiAgICAgIHBpcGVsaW5lQ29uZmlnOiBbZ2V0Rm4sIGNyZWF0ZUZuXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVuaXRSZXNvbHZlciA9IChcbiAgICAgIGlkU3RyOiBzdHJpbmcsXG4gICAgICB0eXBlTmFtZTogc3RyaW5nLFxuICAgICAgZmllbGROYW1lOiBzdHJpbmcsXG4gICAgICBkczogYXBwc3luYy5EeW5hbW9EYkRhdGFTb3VyY2UsXG4gICAgICBmaWxlOiBzdHJpbmcsXG4gICAgKSA9PlxuICAgICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgaWRTdHIsIHtcbiAgICAgICAgYXBpOiB0aGlzLmFwaSxcbiAgICAgICAgdHlwZU5hbWUsXG4gICAgICAgIGZpZWxkTmFtZSxcbiAgICAgICAgZGF0YVNvdXJjZTogZHMsXG4gICAgICAgIHJ1bnRpbWU6IEpTX1JVTlRJTUUsXG4gICAgICAgIGNvZGU6IGNvZGUoZmlsZSksXG4gICAgICB9KTtcblxuICAgIHVuaXRSZXNvbHZlcignVXBzZXJ0UHJvZmlsZVJlc29sdmVyJywgJ011dGF0aW9uJywgJ3Vwc2VydE15UHJvZmlsZScsIGRzVXNlcnMsICd1cHNlcnRNeVByb2ZpbGUuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1VwZGF0ZVNlY29uZGFyeUVtYWlsUmVzb2x2ZXInLCAnTXV0YXRpb24nLCAndXBkYXRlU2Vjb25kYXJ5RW1haWwnLCBkc1VzZXJzLCAndXBkYXRlU2Vjb25kYXJ5RW1haWwuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0xpc3RNeU91dGNvbWVzUmVzb2x2ZXInLCAnUXVlcnknLCAnbGlzdE15T3V0Y29tZXMnLCBkc091dGNvbWVzLCAnbGlzdE15T3V0Y29tZXMuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0NyZWF0ZU91dGNvbWVSZXNvbHZlcicsICdNdXRhdGlvbicsICdjcmVhdGVPdXRjb21lJywgZHNPdXRjb21lcywgJ2NyZWF0ZU91dGNvbWUuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0dldEFwcENvbmZpZ1Jlc29sdmVyJywgJ1F1ZXJ5JywgJ2dldEFwcENvbmZpZycsIGRzQXBwQ29uZmlnLCAnZ2V0QXBwQ29uZmlnLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdBZG1pbkxpc3RVc2Vyc1Jlc29sdmVyJywgJ1F1ZXJ5JywgJ2FkbWluTGlzdFVzZXJzJywgZHNVc2VycywgJ2FkbWluTGlzdFVzZXJzLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdBZG1pbkdldFByb2ZpbGVSZXNvbHZlcicsICdRdWVyeScsICdhZG1pbkdldFByb2ZpbGUnLCBkc1VzZXJzLCAnYWRtaW5HZXRQcm9maWxlLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdVcHNlcnRQcm9ncmFtUmVzb2x2ZXInLCAnTXV0YXRpb24nLCAndXBzZXJ0UHJvZ3JhbScsIGRzUHJvZ3JhbXMsICd1cHNlcnRQcm9ncmFtLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdVcHNlcnRXZWVrbHlDb250ZW50UmVzb2x2ZXInLCAnTXV0YXRpb24nLCAndXBzZXJ0V2Vla2x5Q29udGVudCcsIGRzV2Vla2x5LCAndXBzZXJ0V2Vla2x5Q29udGVudC5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignVXBzZXJ0VGllckNhdGFsb2dSZXNvbHZlcicsICdNdXRhdGlvbicsICd1cHNlcnRUaWVyQ2F0YWxvZycsIGRzVGllckNhdGFsb2csICd1cHNlcnRUaWVyQ2F0YWxvZy5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignVXBzZXJ0QXBwQ29uZmlnUmVzb2x2ZXInLCAnTXV0YXRpb24nLCAndXBzZXJ0QXBwQ29uZmlnJywgZHNBcHBDb25maWcsICd1cHNlcnRBcHBDb25maWcuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1VwY29taW5nRXZlbnRzUmVzb2x2ZXInLCAnUXVlcnknLCAndXBjb21pbmdFdmVudHMnLCBkc0V2ZW50cywgJ3VwY29taW5nRXZlbnRzLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdSc3ZwRXZlbnRSZXNvbHZlcicsICdNdXRhdGlvbicsICdyc3ZwRXZlbnQnLCBkc0V2ZW50UnN2cHMsICdyc3ZwRXZlbnQuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0xpc3RQcm90ZWdlc1Jlc29sdmVyJywgJ1F1ZXJ5JywgJ2xpc3RQcm90ZWdlcycsIGRzQ29udGFjdCwgJ2xpc3RQcm90ZWdlcy5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignTGlzdEV2ZW50c0FkbWluUmVzb2x2ZXInLCAnUXVlcnknLCAnbGlzdEV2ZW50c0FkbWluJywgZHNFdmVudHMsICdsaXN0RXZlbnRzQWRtaW4uanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1VwZGF0ZUV2ZW50UmVjb3JkaW5nVXJsUmVzb2x2ZXInLCAnTXV0YXRpb24nLCAndXBkYXRlRXZlbnRSZWNvcmRpbmdVcmwnLCBkc0V2ZW50cywgJ3VwZGF0ZUV2ZW50UmVjb3JkaW5nVXJsLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdSZWNvcmRBZGhlcmVuY2VSZXNvbHZlcicsICdNdXRhdGlvbicsICdyZWNvcmRBZGhlcmVuY2UnLCBkc0FkaGVyZW5jZSwgJ3JlY29yZEFkaGVyZW5jZS5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignTGlzdE15QWRoZXJlbmNlUmVzb2x2ZXInLCAnUXVlcnknLCAnbGlzdE15QWRoZXJlbmNlJywgZHNBZGhlcmVuY2UsICdsaXN0TXlBZGhlcmVuY2UuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0xpc3RQYXRpZW50UmVjb3Jkc0FkbWluUmVzb2x2ZXInLCAnUXVlcnknLCAnbGlzdFBhdGllbnRSZWNvcmRzQWRtaW4nLCBkc1BhdGllbnRSZWNvcmRzLCAnbGlzdFBhdGllbnRSZWNvcmRzQWRtaW4uanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ0dldFBhdGllbnRSZWNvcmRBZG1pblJlc29sdmVyJywgJ1F1ZXJ5JywgJ2dldFBhdGllbnRSZWNvcmRBZG1pbicsIGRzUGF0aWVudFJlY29yZHMsICdnZXRQYXRpZW50UmVjb3JkQWRtaW4uanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1VwZGF0ZUVuY291bnRlclN0YXRlQWRtaW5SZXNvbHZlcicsICdNdXRhdGlvbicsICd1cGRhdGVFbmNvdW50ZXJTdGF0ZUFkbWluJywgZHNQYXRpZW50UmVjb3JkcywgJ3VwZGF0ZUVuY291bnRlclN0YXRlQWRtaW4uanMnKTtcblxuICAgIC8vIOKUgOKUgOKUgCBDaGFyZ2VFbmNvdW50ZXJBZG1pbiDigJQgTGFtYmRhIGRhdGEgc291cmNlIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuICAgIGNvbnN0IGNoYXJnZUZuID0gbGFtYmRhLkZ1bmN0aW9uLmZyb21GdW5jdGlvbk5hbWUodGhpcywgJ0NoYXJnZU9uQXBwcm92YWxGbicsICdteTRtbGlmZS1jaGFyZ2Utb24tYXBwcm92YWwnKTtcbiAgICBjb25zdCBkc0NoYXJnZSA9IHRoaXMuYXBpLmFkZExhbWJkYURhdGFTb3VyY2UoJ0NoYXJnZU9uQXBwcm92YWxEUycsIGNoYXJnZUZuKTtcbiAgICBuZXcgYXBwc3luYy5SZXNvbHZlcih0aGlzLCAnQ2hhcmdlRW5jb3VudGVyQWRtaW5SZXNvbHZlcicsIHtcbiAgICAgIGFwaTogdGhpcy5hcGksXG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ2NoYXJnZUVuY291bnRlckFkbWluJyxcbiAgICAgIGRhdGFTb3VyY2U6IGRzQ2hhcmdlLFxuICAgICAgcnVudGltZTogSlNfUlVOVElNRSxcbiAgICAgIGNvZGU6IGNvZGUoJ2NoYXJnZUVuY291bnRlckFkbWluLmpzJyksXG4gICAgfSk7XG5cbiAgICAvLyDilIDilIDilIAgRXhwb3J0Q2xpbmljYWxQYWNrZXRBZG1pbiDigJQgTGFtYmRhIGRhdGEgc291cmNlIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuICAgIGNvbnN0IGV4cG9ydFBhY2tldEZuID0gbGFtYmRhLkZ1bmN0aW9uLmZyb21GdW5jdGlvbk5hbWUodGhpcywgJ0V4cG9ydFBhY2tldEZuJywgJ215NG1saWZlLWV4cG9ydC1jbGluaWNhbC1wYWNrZXQnKTtcbiAgICBjb25zdCBkc0V4cG9ydFBhY2tldCA9IHRoaXMuYXBpLmFkZExhbWJkYURhdGFTb3VyY2UoJ0V4cG9ydENsaW5pY2FsUGFja2V0RFMnLCBleHBvcnRQYWNrZXRGbik7XG4gICAgbmV3IGFwcHN5bmMuUmVzb2x2ZXIodGhpcywgJ0V4cG9ydENsaW5pY2FsUGFja2V0QWRtaW5SZXNvbHZlcicsIHtcbiAgICAgIGFwaTogdGhpcy5hcGksXG4gICAgICB0eXBlTmFtZTogJ011dGF0aW9uJyxcbiAgICAgIGZpZWxkTmFtZTogJ2V4cG9ydENsaW5pY2FsUGFja2V0QWRtaW4nLFxuICAgICAgZGF0YVNvdXJjZTogZHNFeHBvcnRQYWNrZXQsXG4gICAgICBydW50aW1lOiBKU19SVU5USU1FLFxuICAgICAgY29kZTogY29kZSgnZXhwb3J0Q2xpbmljYWxQYWNrZXRBZG1pbi5qcycpLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ2dyYXBocWxVcmwnLCB7IHZhbHVlOiB0aGlzLmFwaS5ncmFwaHFsVXJsIH0pO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdhcGlJZCcsIHsgdmFsdWU6IHRoaXMuYXBpLmFwaUlkIH0pO1xuICB9XG59XG4iXX0=