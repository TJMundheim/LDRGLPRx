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
            runtime: aws_lambda_1.Runtime.NODEJS_20_X,
            bundling: { target: 'node20', minify: false, sourceMap: true },
            timeout: cdk.Duration.seconds(15),
        });
        sendAppLink.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ses:SendEmail', 'ses:SendRawEmail', 'sesv2:SendEmail'],
            resources: [`arn:aws:ses:us-east-2:879696522760:identity/*`],
        }));
        // ── request-otp Lambda ─────────────────────────────────────────────────
        const requestOtp = new aws_lambda_nodejs_1.NodejsFunction(this, 'RequestOtpFn', {
            entry: path.join(__dirname, '..', 'lambdas', 'auth', 'request-otp.ts'),
            handler: 'handler',
            runtime: aws_lambda_1.Runtime.NODEJS_20_X,
            bundling: { target: 'node20', minify: false, sourceMap: true },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVhZC1jYXB0dXJlLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGVhZC1jYXB0dXJlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3QixpREFBbUM7QUFFbkMseURBQTJDO0FBRTNDLHVEQUFpRDtBQUNqRCxxRUFBK0Q7QUFDL0Qsc0VBQXdEO0FBQ3hELDZGQUFrRjtBQUVsRixNQUFNLFlBQVksR0FBRyxxQkFBcUIsQ0FBQztBQUMzQyxNQUFNLGFBQWEsR0FBRyw0QkFBNEIsQ0FBQztBQU1uRCxNQUFhLGdCQUFpQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNkI7UUFDckUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsMkVBQTJFO1FBQzNFLE1BQU0sV0FBVyxHQUFHLElBQUksa0NBQWMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQzVELEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQztZQUNoRixPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFO1lBQzlELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsV0FBVyxDQUFDLGVBQWUsQ0FDekIsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ3RCLE9BQU8sRUFBRSxDQUFDLGVBQWUsRUFBRSxrQkFBa0IsRUFBRSxpQkFB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QW1CLEVBQUUsRUFBRTtnQkFDdkIsb0JBQW9CLEVBQUUsRUFBRTthQUN6QixDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDM0MsS0FBSyxFQUFFLEdBQUcsQ0FBQyxXQUFXO1lBQ3RCLFdBQVcsRUFBRSxvQ0FBb0M7U0FDbEQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBcEdELDRDQW9HQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0IHsgUnVudGltZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgTm9kZWpzRnVuY3Rpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XG5pbXBvcnQgKiBhcyBhcGlnd3YyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xuaW1wb3J0IHsgSHR0cExhbWJkYUludGVncmF0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xuXG5jb25zdCBVU0VSX1BPT0xfSUQgPSAndXMtZWFzdC0yX2tJcEtucjE3Uic7XG5jb25zdCBBUFBfQ0xJRU5UX0lEID0gJzZidXI0ZWlwdjY3dmxzbWkwcWNlcXY5ZmQwJztcblxuZXhwb3J0IGludGVyZmFjZSBMZWFkQ2FwdHVyZVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHVzZXJzVGFibGU/OiBkeW5hbW9kYi5UYWJsZTtcbn1cblxuZXhwb3J0IGNsYXNzIExlYWRDYXB0dXJlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IExlYWRDYXB0dXJlU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8g4pSA4pSAIHNlbmQtYXBwLWxpbmsgTGFtYmRhIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuICAgIGNvbnN0IHNlbmRBcHBMaW5rID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdTZW5kQXBwTGlua0ZuJywge1xuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdsYW1iZGFzJywgJ2xlYWQtY2FwdHVyZScsICdzZW5kLWFwcC1saW5rLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgYnVuZGxpbmc6IHsgdGFyZ2V0OiAnbm9kZTIwJywgbWluaWZ5OiBmYWxzZSwgc291cmNlTWFwOiB0cnVlIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxNSksXG4gICAgfSk7XG5cbiAgICBzZW5kQXBwTGluay5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFsnc2VzOlNlbmRFbWFpbCcsICdzZXM6U2VuZFJhd0VtYWlsJywgJ3Nlc3YyOlNlbmRFbWFpbCddLFxuICAgICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpzZXM6dXMtZWFzdC0yOjg3OTY5NjUyMjc2MDppZGVudGl0eS8qYF0sXG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgLy8g4pSA4pSAIHJlcXVlc3Qtb3RwIExhbWJkYSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbiAgICBjb25zdCByZXF1ZXN0T3RwID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdSZXF1ZXN0T3RwRm4nLCB7XG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ2xhbWJkYXMnLCAnYXV0aCcsICdyZXF1ZXN0LW90cC50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGJ1bmRsaW5nOiB7IHRhcmdldDogJ25vZGUyMCcsIG1pbmlmeTogZmFsc2UsIHNvdXJjZU1hcDogdHJ1ZSB9LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTUpLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgVVNFUl9QT09MX0lELFxuICAgICAgICBBUFBfQ0xJRU5UX0lELFxuICAgICAgICBVU0VSU19UQUJMRTogcHJvcHM/LnVzZXJzVGFibGU/LnRhYmxlTmFtZSA/PyAnVXNlcnMnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIENvZ25pdG8gYWRtaW4gcGVybWlzc2lvbnNcbiAgICByZXF1ZXN0T3RwLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkdldFVzZXInLFxuICAgICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXInLFxuICAgICAgICAgICdjb2duaXRvLWlkcDpJbml0aWF0ZUF1dGgnLFxuICAgICAgICBdLFxuICAgICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpjb2duaXRvLWlkcDp1cy1lYXN0LTI6ODc5Njk2NTIyNzYwOnVzZXJwb29sLyR7VVNFUl9QT09MX0lEfWBdLFxuICAgICAgfSksXG4gICAgKTtcblxuICAgIC8vIER5bmFtb0RCIFB1dEl0ZW1cbiAgICBpZiAocHJvcHM/LnVzZXJzVGFibGUpIHtcbiAgICAgIHByb3BzLnVzZXJzVGFibGUuZ3JhbnRXcml0ZURhdGEocmVxdWVzdE90cCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlcXVlc3RPdHAuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgYWN0aW9uczogWydkeW5hbW9kYjpQdXRJdGVtJ10sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6ZHluYW1vZGI6dXMtZWFzdC0yOjg3OTY5NjUyMjc2MDp0YWJsZS9Vc2Vyc2BdLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSAIEhUVFAgQVBJIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnd3YyLkh0dHBBcGkodGhpcywgJ0xlYWRDYXB0dXJlQXBpJywge1xuICAgICAgYXBpTmFtZTogJ015NE1MaWZlTGVhZENhcHR1cmUnLFxuICAgICAgY29yc1ByZWZsaWdodDoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IFtcbiAgICAgICAgICAnaHR0cHM6Ly93d3cubXk0bWxpZmUuY29tJyxcbiAgICAgICAgICAnaHR0cHM6Ly9teTRtbGlmZS5jb20nLFxuICAgICAgICAgICdodHRwczovL2FwcC5teTRtbGlmZS5jb20nLFxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjQzMjEnLFxuICAgICAgICAgICdodHRwOi8vbG9jYWxob3N0OjUxNzMnLFxuICAgICAgICBdLFxuICAgICAgICBhbGxvd01ldGhvZHM6IFthcGlnd3YyLkNvcnNIdHRwTWV0aG9kLlBPU1QsIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuT1BUSU9OU10sXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBhcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvYXBpL3NlbmQtYXBwLWxpbmsnLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTZW5kQXBwTGlua0ludGVncmF0aW9uJywgc2VuZEFwcExpbmspLFxuICAgIH0pO1xuXG4gICAgYXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2FwaS9yZXF1ZXN0LW90cCcsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1JlcXVlc3RPdHBJbnRlZ3JhdGlvbicsIHJlcXVlc3RPdHApLFxuICAgIH0pO1xuXG4gICAgLy8gQmFzaWMgdGhyb3R0bGluZyB2aWEgZGVmYXVsdCBzdGFnZVxuICAgIGNvbnN0IGRlZmF1bHRTdGFnZSA9IGFwaS5kZWZhdWx0U3RhZ2U/Lm5vZGUuZGVmYXVsdENoaWxkIGFzIGFwaWd3djIuQ2ZuU3RhZ2U7XG4gICAgaWYgKGRlZmF1bHRTdGFnZSkge1xuICAgICAgZGVmYXVsdFN0YWdlLmRlZmF1bHRSb3V0ZVNldHRpbmdzID0ge1xuICAgICAgICB0aHJvdHRsaW5nUmF0ZUxpbWl0OiAxMCxcbiAgICAgICAgdGhyb3R0bGluZ0J1cnN0TGltaXQ6IDUwLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTGVhZENhcHR1cmVBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogYXBpLmFwaUVuZHBvaW50LFxuICAgICAgZGVzY3JpcHRpb246ICdNeTRNTGlmZSBMZWFkIENhcHR1cmUgQVBJIGVuZHBvaW50JyxcbiAgICB9KTtcbiAgfVxufVxuIl19