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
        new cdk.CfnOutput(this, 'graphqlUrl', { value: this.api.graphqlUrl });
        new cdk.CfnOutput(this, 'apiId', { value: this.api.apiId });
    }
}
exports.ApiStack = ApiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBpLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3QixpREFBbUM7QUFFbkMsaUVBQW1EO0FBQ25ELGlFQUFtRDtBQUNuRCxtRUFBcUQ7QUFlckQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQzlELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFFbEYsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUM7QUFFcEQsTUFBYSxRQUFTLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDckIsR0FBRyxDQUFxQjtJQUV4QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLFFBQXVCLEVBQUU7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxRQUFRLEdBQ1osS0FBSyxDQUFDLFFBQVE7WUFDZCxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtnQkFDekMsWUFBWSxFQUFFLEdBQUcsRUFBRSxZQUFZO2dCQUMvQixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO2FBQ3pDLENBQUMsQ0FBQztRQUVMLE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBVyxFQUFFLElBQVksRUFBbUIsRUFBRTtZQUMvRCxNQUFNLENBQUMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUU7Z0JBQy9DLFNBQVMsRUFBRSxHQUFHLEVBQUUsSUFBSSxJQUFJLEVBQUU7Z0JBQzFCLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7Z0JBQ2pELFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO2dCQUNqRSxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO2FBQ3pDLENBQUMsQ0FBQztZQUNILENBQUMsQ0FBQyx1QkFBdUIsQ0FBQztnQkFDeEIsU0FBUyxFQUFFLFNBQVM7Z0JBQ3BCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO2dCQUNwRSxjQUFjLEVBQUUsUUFBUSxDQUFDLGNBQWMsQ0FBQyxHQUFHO2FBQzVDLENBQUMsQ0FBQztZQUNILE9BQU8sQ0FBQyxDQUFDO1FBQ1gsQ0FBQyxDQUFDO1FBQ0YsTUFBTSxNQUFNLEdBQUcsQ0FBQyxHQUFXLEVBQUUsSUFBWSxFQUFFLEVBQUUsR0FBRyxJQUFJLEVBQW1CLEVBQUUsQ0FDdkUsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLEdBQUcsRUFBRSxFQUFFO1lBQ3JDLFNBQVMsRUFBRSxHQUFHLEVBQUUsSUFBSSxJQUFJLEVBQUU7WUFDMUIsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUMvRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVMLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNuRSxNQUFNLGNBQWMsR0FDbEIsS0FBSyxDQUFDLHVCQUF1QixJQUFJLFNBQVMsQ0FBQyxXQUFXLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUNoRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsYUFBYSxJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDL0UsTUFBTSxXQUFXLEdBQ2YsS0FBSyxDQUFDLGdCQUFnQixJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDL0QsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGFBQWEsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQzVFLE1BQU0sV0FBVyxHQUNmLEtBQUssQ0FBQyxrQkFBa0IsSUFBSSxNQUFNLENBQUMsZUFBZSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sZUFBZSxHQUNuQixLQUFLLENBQUMsZUFBZSxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDOUQsTUFBTSxjQUFjLEdBQ2xCLEtBQUssQ0FBQyxjQUFjLElBQUksTUFBTSxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEUsTUFBTSxnQkFBZ0IsR0FDcEIsS0FBSyxDQUFDLGdCQUFnQixJQUFJLE1BQU0sQ0FBQyxhQUFhLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFakUsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtZQUM3QyxJQUFJLEVBQUUsa0JBQWtCO1lBQ3hCLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7WUFDcEQsbUJBQW1CLEVBQUU7Z0JBQ25CLG9CQUFvQixFQUFFO29CQUNwQixpQkFBaUIsRUFBRSxPQUFPLENBQUMsaUJBQWlCLENBQUMsU0FBUztvQkFDdEQsY0FBYyxFQUFFLEVBQUUsUUFBUSxFQUFFO2lCQUM3QjtnQkFDRCw0QkFBNEIsRUFBRTtvQkFDNUIsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFO2lCQUNyRDthQUNGO1lBQ0QsV0FBVyxFQUFFLEtBQUs7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDdEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDL0UsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDbEYsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDL0UsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekUsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUN4RixJQUFJLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUVoRSxNQUFNLElBQUksR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFLENBQzVCLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFekQsaURBQWlEO1FBQ2pELE1BQU0sS0FBSyxHQUFHLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQzlELEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRztZQUNiLFVBQVUsRUFBRSxPQUFPO1lBQ25CLElBQUksRUFBRSxjQUFjO1lBQ3BCLE9BQU8sRUFBRSxVQUFVO1lBQ25CLElBQUksRUFBRSxJQUFJLENBQUMscUJBQXFCLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUNwRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDYixVQUFVLEVBQUUsT0FBTztZQUNuQixJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLE9BQU8sRUFBRSxVQUFVO1lBQ25CLElBQUksRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUM7U0FDckMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUNqRCxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUc7WUFDYixRQUFRLEVBQUUsT0FBTztZQUNqQixTQUFTLEVBQUUsY0FBYztZQUN6QixPQUFPLEVBQUUsVUFBVTtZQUNuQixJQUFJLEVBQUUsSUFBSSxDQUFDLDBCQUEwQixDQUFDO1lBQ3RDLGNBQWMsRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxZQUFZLEdBQUcsQ0FDbkIsS0FBYSxFQUNiLFFBQWdCLEVBQ2hCLFNBQWlCLEVBQ2pCLEVBQThCLEVBQzlCLElBQVksRUFDWixFQUFFLENBQ0YsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7WUFDaEMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHO1lBQ2IsUUFBUTtZQUNSLFNBQVM7WUFDVCxVQUFVLEVBQUUsRUFBRTtZQUNkLE9BQU8sRUFBRSxVQUFVO1lBQ25CLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDO1NBQ2pCLENBQUMsQ0FBQztRQUVMLFlBQVksQ0FBQyx1QkFBdUIsRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDcEcsWUFBWSxDQUFDLDhCQUE4QixFQUFFLFVBQVUsRUFBRSxzQkFBc0IsRUFBRSxPQUFPLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUNySCxZQUFZLENBQUMsd0JBQXdCLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQ25HLFlBQVksQ0FBQyx1QkFBdUIsRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ25HLFlBQVksQ0FBQyxzQkFBc0IsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzlGLFlBQVksQ0FBQyx3QkFBd0IsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDaEcsWUFBWSxDQUFDLHlCQUF5QixFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUNuRyxZQUFZLENBQUMsdUJBQXVCLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUNuRyxZQUFZLENBQUMsNkJBQTZCLEVBQUUsVUFBVSxFQUFFLHFCQUFxQixFQUFFLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO1FBQ25ILFlBQVksQ0FBQywyQkFBMkIsRUFBRSxVQUFVLEVBQUUsbUJBQW1CLEVBQUUsYUFBYSxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFDbEgsWUFBWSxDQUFDLHlCQUF5QixFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUUxRyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDdEUsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzlELENBQUM7Q0FDRjtBQXRJRCw0QkFzSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgYXBwc3luYyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBwc3luYyc7XG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBpU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgdXNlclBvb2w/OiBjb2duaXRvLklVc2VyUG9vbDtcbiAgdXNlcnNUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgZGlzY292ZXJ5UmVzcG9uc2VzVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIG91dGNvbWVzVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIGludGFrZUZvcm1zVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIHByb2dyYW1zVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIHdlZWtseUNvbnRlbnRUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgYWRtaW5RdWV1ZVRhYmxlPzogZHluYW1vZGIuSVRhYmxlO1xuICBhcHBDb25maWdUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbiAgdGllckNhdGFsb2dUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbn1cblxuY29uc3QgUkVTT0xWRVJTX0RJUiA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdyZXNvbHZlcnMnKTtcbmNvbnN0IFNDSEVNQV9QQVRIID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJy4uJywgJ2FwcHN5bmMnLCAnc2NoZW1hLmdyYXBocWwnKTtcblxuY29uc3QgSlNfUlVOVElNRSA9IGFwcHN5bmMuRnVuY3Rpb25SdW50aW1lLkpTXzFfMF8wO1xuXG5leHBvcnQgY2xhc3MgQXBpU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgYXBpOiBhcHBzeW5jLkdyYXBocWxBcGk7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwaVN0YWNrUHJvcHMgPSB7fSkge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgdXNlclBvb2wgPVxuICAgICAgcHJvcHMudXNlclBvb2wgPz9cbiAgICAgIG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdTdHViVXNlclBvb2wnLCB7XG4gICAgICAgIHVzZXJQb29sTmFtZTogYCR7aWR9LXN0dWItcG9vbGAsXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJPd25lZCA9IChrZXk6IHN0cmluZywgbmFtZTogc3RyaW5nKTogZHluYW1vZGIuSVRhYmxlID0+IHtcbiAgICAgIGNvbnN0IHQgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgYFN0dWIke2tleX1gLCB7XG4gICAgICAgIHRhYmxlTmFtZTogYCR7aWR9LSR7bmFtZX1gLFxuICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuICAgICAgdC5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICAgIGluZGV4TmFtZTogJ2J5T3duZXInLFxuICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ293bmVyJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHQ7XG4gICAgfTtcbiAgICBjb25zdCBzaW1wbGUgPSAoa2V5OiBzdHJpbmcsIG5hbWU6IHN0cmluZywgcGsgPSAnaWQnKTogZHluYW1vZGIuSVRhYmxlID0+XG4gICAgICBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgYFN0dWIke2tleX1gLCB7XG4gICAgICAgIHRhYmxlTmFtZTogYCR7aWR9LSR7bmFtZX1gLFxuICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogcGssIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJzVGFibGUgPSBwcm9wcy51c2Vyc1RhYmxlID8/IHVzZXJPd25lZCgnVXNlcnMnLCAnVXNlcnMnKTtcbiAgICBjb25zdCBkaXNjb3ZlcnlUYWJsZSA9XG4gICAgICBwcm9wcy5kaXNjb3ZlcnlSZXNwb25zZXNUYWJsZSA/PyB1c2VyT3duZWQoJ0Rpc2NvdmVyeScsICdEaXNjb3ZlcnlSZXNwb25zZXMnKTtcbiAgICBjb25zdCBvdXRjb21lc1RhYmxlID0gcHJvcHMub3V0Y29tZXNUYWJsZSA/PyB1c2VyT3duZWQoJ091dGNvbWVzJywgJ091dGNvbWVzJyk7XG4gICAgY29uc3QgaW50YWtlVGFibGUgPVxuICAgICAgcHJvcHMuaW50YWtlRm9ybXNUYWJsZSA/PyB1c2VyT3duZWQoJ0ludGFrZScsICdJbnRha2VGb3JtcycpO1xuICAgIGNvbnN0IHByb2dyYW1zVGFibGUgPSBwcm9wcy5wcm9ncmFtc1RhYmxlID8/IHNpbXBsZSgnUHJvZ3JhbXMnLCAnUHJvZ3JhbXMnKTtcbiAgICBjb25zdCB3ZWVrbHlUYWJsZSA9XG4gICAgICBwcm9wcy53ZWVrbHlDb250ZW50VGFibGUgPz8gc2ltcGxlKCdXZWVrbHlDb250ZW50JywgJ1dlZWtseUNvbnRlbnQnKTtcbiAgICBjb25zdCBhZG1pblF1ZXVlVGFibGUgPVxuICAgICAgcHJvcHMuYWRtaW5RdWV1ZVRhYmxlID8/IHNpbXBsZSgnQWRtaW5RdWV1ZScsICdBZG1pblF1ZXVlJyk7XG4gICAgY29uc3QgYXBwQ29uZmlnVGFibGUgPVxuICAgICAgcHJvcHMuYXBwQ29uZmlnVGFibGUgPz8gc2ltcGxlKCdBcHBDb25maWcnLCAnQXBwQ29uZmlnJywgJ2tleScpO1xuICAgIGNvbnN0IHRpZXJDYXRhbG9nVGFibGUgPVxuICAgICAgcHJvcHMudGllckNhdGFsb2dUYWJsZSA/PyBzaW1wbGUoJ1RpZXJDYXRhbG9nJywgJ1RpZXJDYXRhbG9nJyk7XG5cbiAgICB0aGlzLmFwaSA9IG5ldyBhcHBzeW5jLkdyYXBocWxBcGkodGhpcywgJ0FwaScsIHtcbiAgICAgIG5hbWU6ICdjbGllbnRwb3J0YWwtYXBpJyxcbiAgICAgIGRlZmluaXRpb246IGFwcHN5bmMuRGVmaW5pdGlvbi5mcm9tRmlsZShTQ0hFTUFfUEFUSCksXG4gICAgICBhdXRob3JpemF0aW9uQ29uZmlnOiB7XG4gICAgICAgIGRlZmF1bHRBdXRob3JpemF0aW9uOiB7XG4gICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwcHN5bmMuQXV0aG9yaXphdGlvblR5cGUuVVNFUl9QT09MLFxuICAgICAgICAgIHVzZXJQb29sQ29uZmlnOiB7IHVzZXJQb29sIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGFkZGl0aW9uYWxBdXRob3JpemF0aW9uTW9kZXM6IFtcbiAgICAgICAgICB7IGF1dGhvcml6YXRpb25UeXBlOiBhcHBzeW5jLkF1dGhvcml6YXRpb25UeXBlLklBTSB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIHhyYXlFbmFibGVkOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGRzVXNlcnMgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ1VzZXJzRFMnLCB1c2Vyc1RhYmxlKTtcbiAgICBjb25zdCBkc091dGNvbWVzID0gdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdPdXRjb21lc0RTJywgb3V0Y29tZXNUYWJsZSk7XG4gICAgY29uc3QgZHNBcHBDb25maWcgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ0FwcENvbmZpZ0RTJywgYXBwQ29uZmlnVGFibGUpO1xuICAgIGNvbnN0IGRzUHJvZ3JhbXMgPSB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ1Byb2dyYW1zRFMnLCBwcm9ncmFtc1RhYmxlKTtcbiAgICBjb25zdCBkc1dlZWtseSA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnV2Vla2x5RFMnLCB3ZWVrbHlUYWJsZSk7XG4gICAgY29uc3QgZHNUaWVyQ2F0YWxvZyA9IHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnVGllckNhdGFsb2dEUycsIHRpZXJDYXRhbG9nVGFibGUpO1xuICAgIHRoaXMuYXBpLmFkZER5bmFtb0RiRGF0YVNvdXJjZSgnRGlzY292ZXJ5RFMnLCBkaXNjb3ZlcnlUYWJsZSk7XG4gICAgdGhpcy5hcGkuYWRkRHluYW1vRGJEYXRhU291cmNlKCdJbnRha2VEUycsIGludGFrZVRhYmxlKTtcbiAgICB0aGlzLmFwaS5hZGREeW5hbW9EYkRhdGFTb3VyY2UoJ0FkbWluUXVldWVEUycsIGFkbWluUXVldWVUYWJsZSk7XG5cbiAgICBjb25zdCBjb2RlID0gKGZpbGU6IHN0cmluZykgPT5cbiAgICAgIGFwcHN5bmMuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKFJFU09MVkVSU19ESVIsIGZpbGUpKTtcblxuICAgIC8vIGdldE15UHJvZmlsZSBwaXBlbGluZSAoYXV0by1jcmVhdGUgb24gbWlzc2luZylcbiAgICBjb25zdCBnZXRGbiA9IG5ldyBhcHBzeW5jLkFwcHN5bmNGdW5jdGlvbih0aGlzLCAnR2V0UHJvZmlsZUZuJywge1xuICAgICAgYXBpOiB0aGlzLmFwaSxcbiAgICAgIGRhdGFTb3VyY2U6IGRzVXNlcnMsXG4gICAgICBuYW1lOiAnZ2V0UHJvZmlsZUZuJyxcbiAgICAgIHJ1bnRpbWU6IEpTX1JVTlRJTUUsXG4gICAgICBjb2RlOiBjb2RlKCdnZXRNeVByb2ZpbGUuZ2V0LmpzJyksXG4gICAgfSk7XG4gICAgY29uc3QgY3JlYXRlRm4gPSBuZXcgYXBwc3luYy5BcHBzeW5jRnVuY3Rpb24odGhpcywgJ0NyZWF0ZVByb2ZpbGVGbicsIHtcbiAgICAgIGFwaTogdGhpcy5hcGksXG4gICAgICBkYXRhU291cmNlOiBkc1VzZXJzLFxuICAgICAgbmFtZTogJ2NyZWF0ZVByb2ZpbGVGbicsXG4gICAgICBydW50aW1lOiBKU19SVU5USU1FLFxuICAgICAgY29kZTogY29kZSgnZ2V0TXlQcm9maWxlLmNyZWF0ZS5qcycpLFxuICAgIH0pO1xuICAgIG5ldyBhcHBzeW5jLlJlc29sdmVyKHRoaXMsICdHZXRNeVByb2ZpbGVSZXNvbHZlcicsIHtcbiAgICAgIGFwaTogdGhpcy5hcGksXG4gICAgICB0eXBlTmFtZTogJ1F1ZXJ5JyxcbiAgICAgIGZpZWxkTmFtZTogJ2dldE15UHJvZmlsZScsXG4gICAgICBydW50aW1lOiBKU19SVU5USU1FLFxuICAgICAgY29kZTogY29kZSgnZ2V0TXlQcm9maWxlLnBpcGVsaW5lLmpzJyksXG4gICAgICBwaXBlbGluZUNvbmZpZzogW2dldEZuLCBjcmVhdGVGbl0sXG4gICAgfSk7XG5cbiAgICBjb25zdCB1bml0UmVzb2x2ZXIgPSAoXG4gICAgICBpZFN0cjogc3RyaW5nLFxuICAgICAgdHlwZU5hbWU6IHN0cmluZyxcbiAgICAgIGZpZWxkTmFtZTogc3RyaW5nLFxuICAgICAgZHM6IGFwcHN5bmMuRHluYW1vRGJEYXRhU291cmNlLFxuICAgICAgZmlsZTogc3RyaW5nLFxuICAgICkgPT5cbiAgICAgIG5ldyBhcHBzeW5jLlJlc29sdmVyKHRoaXMsIGlkU3RyLCB7XG4gICAgICAgIGFwaTogdGhpcy5hcGksXG4gICAgICAgIHR5cGVOYW1lLFxuICAgICAgICBmaWVsZE5hbWUsXG4gICAgICAgIGRhdGFTb3VyY2U6IGRzLFxuICAgICAgICBydW50aW1lOiBKU19SVU5USU1FLFxuICAgICAgICBjb2RlOiBjb2RlKGZpbGUpLFxuICAgICAgfSk7XG5cbiAgICB1bml0UmVzb2x2ZXIoJ1Vwc2VydFByb2ZpbGVSZXNvbHZlcicsICdNdXRhdGlvbicsICd1cHNlcnRNeVByb2ZpbGUnLCBkc1VzZXJzLCAndXBzZXJ0TXlQcm9maWxlLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdVcGRhdGVTZWNvbmRhcnlFbWFpbFJlc29sdmVyJywgJ011dGF0aW9uJywgJ3VwZGF0ZVNlY29uZGFyeUVtYWlsJywgZHNVc2VycywgJ3VwZGF0ZVNlY29uZGFyeUVtYWlsLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdMaXN0TXlPdXRjb21lc1Jlc29sdmVyJywgJ1F1ZXJ5JywgJ2xpc3RNeU91dGNvbWVzJywgZHNPdXRjb21lcywgJ2xpc3RNeU91dGNvbWVzLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdDcmVhdGVPdXRjb21lUmVzb2x2ZXInLCAnTXV0YXRpb24nLCAnY3JlYXRlT3V0Y29tZScsIGRzT3V0Y29tZXMsICdjcmVhdGVPdXRjb21lLmpzJyk7XG4gICAgdW5pdFJlc29sdmVyKCdHZXRBcHBDb25maWdSZXNvbHZlcicsICdRdWVyeScsICdnZXRBcHBDb25maWcnLCBkc0FwcENvbmZpZywgJ2dldEFwcENvbmZpZy5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignQWRtaW5MaXN0VXNlcnNSZXNvbHZlcicsICdRdWVyeScsICdhZG1pbkxpc3RVc2VycycsIGRzVXNlcnMsICdhZG1pbkxpc3RVc2Vycy5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignQWRtaW5HZXRQcm9maWxlUmVzb2x2ZXInLCAnUXVlcnknLCAnYWRtaW5HZXRQcm9maWxlJywgZHNVc2VycywgJ2FkbWluR2V0UHJvZmlsZS5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignVXBzZXJ0UHJvZ3JhbVJlc29sdmVyJywgJ011dGF0aW9uJywgJ3Vwc2VydFByb2dyYW0nLCBkc1Byb2dyYW1zLCAndXBzZXJ0UHJvZ3JhbS5qcycpO1xuICAgIHVuaXRSZXNvbHZlcignVXBzZXJ0V2Vla2x5Q29udGVudFJlc29sdmVyJywgJ011dGF0aW9uJywgJ3Vwc2VydFdlZWtseUNvbnRlbnQnLCBkc1dlZWtseSwgJ3Vwc2VydFdlZWtseUNvbnRlbnQuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1Vwc2VydFRpZXJDYXRhbG9nUmVzb2x2ZXInLCAnTXV0YXRpb24nLCAndXBzZXJ0VGllckNhdGFsb2cnLCBkc1RpZXJDYXRhbG9nLCAndXBzZXJ0VGllckNhdGFsb2cuanMnKTtcbiAgICB1bml0UmVzb2x2ZXIoJ1Vwc2VydEFwcENvbmZpZ1Jlc29sdmVyJywgJ011dGF0aW9uJywgJ3Vwc2VydEFwcENvbmZpZycsIGRzQXBwQ29uZmlnLCAndXBzZXJ0QXBwQ29uZmlnLmpzJyk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnZ3JhcGhxbFVybCcsIHsgdmFsdWU6IHRoaXMuYXBpLmdyYXBocWxVcmwgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ2FwaUlkJywgeyB2YWx1ZTogdGhpcy5hcGkuYXBpSWQgfSk7XG4gIH1cbn1cbiJdfQ==