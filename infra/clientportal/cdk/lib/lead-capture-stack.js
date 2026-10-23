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
exports.LeadCaptureStack = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const apigwv2 = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const aws_apigatewayv2_integrations_1 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const USER_POOL_ID = 'us-east-2_kIpKnr17R';
const APP_CLIENT_ID = '6bur4eipv67vlsmi0qceqv9fd0';
class LeadCaptureStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // ── send-app-link Lambda ────────────────────────────────────────────────
        const sendAppLink = new aws_lambda_nodejs_1.NodejsFunction(this, 'SendAppLinkFn', {
            entry: path.join(__dirname, '..', 'lambdas', 'lead-capture', 'send-app-link.ts'),
            handler: 'handler',
            runtime: aws_lambda_1.Runtime.NODEJS_24_X,
            bundling: { target: 'node24', minify: false, sourceMap: true },
            timeout: cdk.Duration.seconds(15),
        });
        sendAppLink.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ses:SendEmail', 'ses:SendRawEmail', 'sesv2:SendEmail'],
            resources: [`arn:aws:ses:us-east-2:879696522760:identity/*`],
        }));
        // Contact capture: send-app-link upserts via UpdateItem only.
        sendAppLink.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:UpdateItem'],
            resources: [
                props?.contactTable?.tableArn ??
                    `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/Contact`,
            ],
        }));
        // ── request-otp Lambda ─────────────────────────────────────────────────
        const requestOtp = new aws_lambda_nodejs_1.NodejsFunction(this, 'RequestOtpFn', {
            entry: path.join(__dirname, '..', 'lambdas', 'auth', 'request-otp.ts'),
            handler: 'handler',
            runtime: aws_lambda_1.Runtime.NODEJS_24_X,
            bundling: { target: 'node24', minify: false, sourceMap: true },
            timeout: cdk.Duration.seconds(15),
            environment: {
                USER_POOL_ID,
                APP_CLIENT_ID,
                USERS_TABLE: props?.usersTable?.tableName ?? 'Users',
            },
        });
        // Cognito admin permissions
        requestOtp.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:InitiateAuth',
            ],
            resources: [`arn:aws:cognito-idp:us-east-2:879696522760:userpool/${USER_POOL_ID}`],
        }));
        // DynamoDB PutItem
        if (props?.usersTable) {
            props.usersTable.grantWriteData(requestOtp);
        }
        else {
            requestOtp.addToRolePolicy(new iam.PolicyStatement({
                actions: ['dynamodb:PutItem'],
                resources: [`arn:aws:dynamodb:us-east-2:879696522760:table/Users`],
            }));
        }
        // ── HTTP API ───────────────────────────────────────────────────────────
        const api = new apigwv2.HttpApi(this, 'LeadCaptureApi', {
            apiName: 'My4MLifeLeadCapture',
            corsPreflight: {
                allowOrigins: [
                    'https://www.my4mlife.com',
                    'https://my4mlife.com',
                    'https://app.my4mlife.com',
                    'http://localhost:4321',
                    'http://localhost:5173',
                ],
                allowMethods: [apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
                allowHeaders: ['Content-Type'],
            },
        });
        api.addRoutes({
            path: '/api/send-app-link',
            methods: [apigwv2.HttpMethod.POST],
            integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('SendAppLinkIntegration', sendAppLink),
        });
        api.addRoutes({
            path: '/api/request-otp',
            methods: [apigwv2.HttpMethod.POST],
            integration: new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('RequestOtpIntegration', requestOtp),
        });
        // Basic throttling via default stage
        const defaultStage = api.defaultStage?.node.defaultChild;
        if (defaultStage) {
            defaultStage.defaultRouteSettings = {
                throttlingRateLimit: 10,
                throttlingBurstLimit: 50,
            };
        }
        new cdk.CfnOutput(this, 'LeadCaptureApiUrl', {
            value: api.apiEndpoint,
            description: 'My4MLife Lead Capture API endpoint',
        });
    }
}
exports.LeadCaptureStack = LeadCaptureStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVhZC1jYXB0dXJlLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGVhZC1jYXB0dXJlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3QixpREFBbUM7QUFFbkMseURBQTJDO0FBRTNDLHVEQUFpRDtBQUNqRCxxRUFBK0Q7QUFDL0Qsc0VBQXdEO0FBQ3hELDZGQUFrRjtBQUVsRixNQUFNLFlBQVksR0FBRyxxQkFBcUIsQ0FBQztBQUMzQyxNQUFNLGFBQWEsR0FBRyw0QkFBNEIsQ0FBQztBQU9uRCxNQUFhLGdCQUFpQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNkI7UUFDckUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsMkVBQTJFO1FBQzNFLE1BQU0sV0FBVyxHQUFHLElBQUksa0NBQWMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQzVELEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQztZQUNoRixPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFO1lBQzlELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsV0FBVyxDQUFDLGVBQWUsQ0FDekIsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ3RCLE9BQU8sRUFBRSxDQUFDLGVBQWUsRUFBRSxrQkFBa0IsRUFBRSxpQkFB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QUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxrQkFBa0I7WUFDeEIsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDbEMsV0FBVyxFQUFFLElBQUkscURBQXFCLENBQUMsdUJBQXVCLEVBQUUsVUFBVSxDQUFDO1NBQzVFLENBQUMsQ0FBQztRQUVILHFDQUFxQztRQUNyQyxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFnQyxDQUFDO1FBQzdFLElBQUksWUFBWSxFQUFFLENBQUM7WUFDakIsWUFBWSxDQUFDLG9CQUFvQixHQUFHO2dCQUNsQyxtQkFBbUIsRUFBRSxFQUFFO2dCQUN2QixvQkFBb0IsRUFBRSxFQUFFO2FBQ3pCLENBQUM7UUFDSixDQUFDO1FBRUQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFdBQVc7WUFDdEIsV0FBVyxFQUFFLG9DQUFvQztTQUNsRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUEvR0QsNENBK0dDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgeyBSdW50aW1lIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBOb2RlanNGdW5jdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJztcbmltcG9ydCAqIGFzIGFwaWd3djIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XG5pbXBvcnQgeyBIdHRwTGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XG5cbmNvbnN0IFVTRVJfUE9PTF9JRCA9ICd1cy1lYXN0LTJfa0lwS25yMTdSJztcbmNvbnN0IEFQUF9DTElFTlRfSUQgPSAnNmJ1cjRlaXB2Njd2bHNtaTBxY2VxdjlmZDAnO1xuXG5leHBvcnQgaW50ZXJmYWNlIExlYWRDYXB0dXJlU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgdXNlcnNUYWJsZT86IGR5bmFtb2RiLlRhYmxlO1xuICBjb250YWN0VGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG59XG5cbmV4cG9ydCBjbGFzcyBMZWFkQ2FwdHVyZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBMZWFkQ2FwdHVyZVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIOKUgOKUgCBzZW5kLWFwcC1saW5rIExhbWJkYSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbiAgICBjb25zdCBzZW5kQXBwTGluayA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnU2VuZEFwcExpbmtGbicsIHtcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnbGFtYmRhcycsICdsZWFkLWNhcHR1cmUnLCAnc2VuZC1hcHAtbGluay50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGJ1bmRsaW5nOiB7IHRhcmdldDogJ25vZGUyMCcsIG1pbmlmeTogZmFsc2UsIHNvdXJjZU1hcDogdHJ1ZSB9LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTUpLFxuICAgIH0pO1xuXG4gICAgc2VuZEFwcExpbmsuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbJ3NlczpTZW5kRW1haWwnLCAnc2VzOlNlbmRSYXdFbWFpbCcsICdzZXN2MjpTZW5kRW1haWwnXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6c2VzOnVzLWVhc3QtMjo4Nzk2OTY1MjI3NjA6aWRlbnRpdHkvKmBdLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIC8vIENvbnRhY3QgY2FwdHVyZTogc2VuZC1hcHAtbGluayB1cHNlcnRzIHZpYSBVcGRhdGVJdGVtIG9ubHkuXG4gICAgc2VuZEFwcExpbmsuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgcHJvcHM/LmNvbnRhY3RUYWJsZT8udGFibGVBcm4gPz9cbiAgICAgICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7Y2RrLlN0YWNrLm9mKHRoaXMpLnJlZ2lvbn06JHtjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudH06dGFibGUvQ29udGFjdGAsXG4gICAgICAgIF0sXG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgLy8g4pSA4pSAIHJlcXVlc3Qtb3RwIExhbWJkYSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbiAgICBjb25zdCByZXF1ZXN0T3RwID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdSZXF1ZXN0T3RwRm4nLCB7XG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ2xhbWJkYXMnLCAnYXV0aCcsICdyZXF1ZXN0LW90cC50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGJ1bmRsaW5nOiB7IHRhcmdldDogJ25vZGUyMCcsIG1pbmlmeTogZmFsc2UsIHNvdXJjZU1hcDogdHJ1ZSB9LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTUpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9QT09MX0lELFxuICAgICAgICBBUFBfQ0xJRU5UX0lELFxuICAgICAgICBVU0VSU19UQUJMRTogcHJvcHM/LnVzZXJzVGFibGU/LnRhYmxlTmFtZSA/PyAnVXNlcnMnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIENvZ25pdG8gYWRtaW4gcGVybWlzc2lvbnNcbiAgICByZXF1ZXN0T3RwLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkdldFVzZXInLFxuICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXInLFxuICAgICAgICAgICdjb2duaXRvLWlkcDpJbml0aWF0ZUF1dGgnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpjb2duaXRvLWlkcDp1cy1lYXN0LTI6ODc5Njk2NTIyNzYwOnVzZXJwb29sLyR7VVNFUl9QT09MX0lEfWBdLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIC8vIER5bmFtb0RCIFB1dEl0ZW1cbiAgICBpZiAocHJvcHM/LnVzZXJzVGFibGUpIHtcbiAgICAgIHByb3BzLnVzZXJzVGFibGUuZ3JhbnRXcml0ZURhdGEocmVxdWVzdE90cCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcXVlc3RPdHAuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgYWN0aW9uczogWydkeW5hbW9kYjpQdXRJdGVtJ10sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6ZHluYW1vZGI6dXMtZWFzdC0yOjg3OTY5NjUyMjc2MDp0YWJsZS9Vc2Vyc2BdLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIEhUVFAgQVBJIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnd3YyLkh0dHBBcGkodGhpcywgJ0xlYWRDYXB0dXJlQXBpJywge1xuICAgICAgYXBpTmFtZTogJ015NE1MaWZlTGVhZENhcHR1cmUnLFxuICAgICAgY29yc1ByZWZsaWdodDoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IFtcbiAgICAgICAgICAnaHR0cHM6Ly93d3cubXk0bWxpZmUuY29tJyxcbiAgICAgICAgICAnaHR0cHM6Ly9teTRtbGlmZS5jb20nLFxuICAgICAgICAgICdodHRwczovL2FwcC5teTRtbGlmZS5jb20nLFxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjQzMjEnLFxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjUxNzMnLFxuICAgICAgICBdLFxuICAgICAgICBhbGxvd01ldGhvZHM6IFthcGlnd3YyLkNvcnNIdHRwTWV0aG9kLlBPU1QsIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuT1BUSU9OU10sXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBhcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvYXBpL3NlbmQtYXBwLWxpbmsnLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTZW5kQXBwTGlua0ludGVncmF0aW9uJywgc2VuZEFwcExpbmspLFxuICAgIH0pO1xuXG4gICAgYXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2FwaS9yZXF1ZXN0LW90cCcsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1JlcXVlc3RPdHBJbnRlZ3JhdGlvbicsIHJlcXVlc3RPdHApLFxuICAgIH0pO1xuXG4gICAgLy8gQmFzaWMgdGhyb3R0bGluZyB2aWEgZGVmYXVsdCBzdGFnZVxuICAgIGNvbnN0IGRlZmF1bHRTdGFnZSA9IGFwaS5kZWZhdWx0U3RhZ2U/Lm5vZGUuZGVmYXVsdENoaWxkIGFzIGFwaWd3djIuQ2ZuU3RhZ2U7XG4gICAgaWYgKGRlZmF1bHRTdGFnZSkge1xuICAgICAgZGVmYXVsdFN0YWdlLmRlZmF1bHRSb3V0ZVNldHRpbmdzID0ge1xuICAgICAgICB0aHJvdHRsaW5nUmF0ZUxpbWl0OiAxMCxcbiAgICAgICAgdGhyb3R0bGluZ0J1cnN0TGltaXQ6IDUwLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTGVhZENhcHR1cmVBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogYXBpLmFwaUVuZHBvaW50LFxuICAgICAgZGVzY3JpcHRpb246ICdNeTRNTGlmZSBMZWFkIENhcHR1cmUgQVBJIGVuZHBvaW50JyxcbiAgICB9KTtcbiAgfVxufVxuIl19