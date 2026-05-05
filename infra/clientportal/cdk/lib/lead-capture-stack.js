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
class LeadCaptureStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Lambda
        const sendAppLink = new aws_lambda_nodejs_1.NodejsFunction(this, 'SendAppLinkFn', {
            entry: path.join(__dirname, '..', 'lambdas', 'lead-capture', 'send-app-link.ts'),
            handler: 'handler',
            runtime: aws_lambda_1.Runtime.NODEJS_20_X,
            bundling: { target: 'node20', minify: false, sourceMap: true },
            timeout: cdk.Duration.seconds(15),
        });
        // SES permission scoped to verified domain identity
        sendAppLink.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ses:SendEmail', 'ses:SendRawEmail', 'sesv2:SendEmail'],
            resources: [
                `arn:aws:ses:us-east-2:879696522760:identity/my4mlife.com`,
            ],
        }));
        // HTTP API
        const api = new apigwv2.HttpApi(this, 'LeadCaptureApi', {
            apiName: 'My4MLifeLeadCapture',
            corsPreflight: {
                allowOrigins: [
                    'https://www.my4mlife.com',
                    'https://my4mlife.com',
                    'https://app.my4mlife.com',
                    'http://localhost:4321',
                ],
                allowMethods: [apigwv2.CorsHttpMethod.POST, apigwv2.CorsHttpMethod.OPTIONS],
                allowHeaders: ['Content-Type'],
            },
        });
        const integration = new aws_apigatewayv2_integrations_1.HttpLambdaIntegration('SendAppLinkIntegration', sendAppLink);
        api.addRoutes({
            path: '/api/send-app-link',
            methods: [apigwv2.HttpMethod.POST],
            integration,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVhZC1jYXB0dXJlLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGVhZC1jYXB0dXJlLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3QixpREFBbUM7QUFFbkMseURBQTJDO0FBQzNDLHVEQUFpRDtBQUNqRCxxRUFBK0Q7QUFDL0Qsc0VBQXdEO0FBQ3hELDZGQUFrRjtBQUVsRixNQUFhLGdCQUFpQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsU0FBUztRQUNULE1BQU0sV0FBVyxHQUFHLElBQUksa0NBQWMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQzVELEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQztZQUNoRixPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFO1lBQzlELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsb0RBQW9EO1FBQ3BELFdBQVcsQ0FBQyxlQUFlLENBQ3pCLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUN0QixPQUFPLEVBQUUsQ0FBQyxlQUFlLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLENBQUM7WUFDakUsU0FBUyxFQUFFO2dCQUNULDBEQUEwRDthQUMzRDtTQUNGLENBQUMsQ0FDSCxDQUFDO1FBRUYsV0FBVztRQUNYLE1BQU0sR0FBRyxHQUFHLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDdEQsT0FBTyxFQUFFLHFCQUFxQjtZQUM5QixhQUFhLEVBQUU7Z0JBQ2IsWUFBWSxFQUFFO29CQUNaLDBCQUEwQjtvQkFDMUIsc0JBQXNCO29CQUN0QiwwQkFBMEI7b0JBQzFCLHVCQUF1QjtpQkFDeEI7Z0JBQ0QsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUM7Z0JBQzNFLFlBQVksRUFBRSxDQUFDLGNBQWMsQ0FBQzthQUMvQjtTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sV0FBVyxHQUFHLElBQUkscURBQXFCLENBQUMsd0JBQXdCLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFckYsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxvQkFBb0I7WUFDMUIsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDbEMsV0FBVztTQUNaLENBQUMsQ0FBQztRQUVILHFDQUFxQztRQUNyQyxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFnQyxDQUFDO1FBQzdFLElBQUksWUFBWSxFQUFFLENBQUM7WUFDakIsWUFBWSxDQUFDLG9CQUFvQixHQUFHO2dCQUNsQyxtQkFBbUIsRUFBRSxFQUFFO2dCQUN2QixvQkFBb0IsRUFBRSxFQUFFO2FBQ3pCLENBQUM7UUFDSixDQUFDO1FBRUQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsR0FBRyxDQUFDLFdBQVc7WUFDdEIsV0FBVyxFQUFFLG9DQUFvQztTQUNsRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE1REQsNENBNERDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IFJ1bnRpbWUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCB7IE5vZGVqc0Z1bmN0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xuaW1wb3J0ICogYXMgYXBpZ3d2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcbmltcG9ydCB7IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcblxuZXhwb3J0IGNsYXNzIExlYWRDYXB0dXJlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBMYW1iZGFcbiAgICBjb25zdCBzZW5kQXBwTGluayA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnU2VuZEFwcExpbmtGbicsIHtcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnbGFtYmRhcycsICdsZWFkLWNhcHR1cmUnLCAnc2VuZC1hcHAtbGluay50cycpLFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGJ1bmRsaW5nOiB7IHRhcmdldDogJ25vZGUyMCcsIG1pbmlmeTogZmFsc2UsIHNvdXJjZU1hcDogdHJ1ZSB9LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTUpLFxuICAgIH0pO1xuXG4gICAgLy8gU0VTIHBlcm1pc3Npb24gc2NvcGVkIHRvIHZlcmlmaWVkIGRvbWFpbiBpZGVudGl0eVxuICAgIHNlbmRBcHBMaW5rLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogWydzZXM6U2VuZEVtYWlsJywgJ3NlczpTZW5kUmF3RW1haWwnLCAnc2VzdjI6U2VuZEVtYWlsJ10sXG4gICAgICAgIHJlc291cmNlczogW1xuICAgICAgICAgIGBhcm46YXdzOnNlczp1cy1lYXN0LTI6ODc5Njk2NTIyNzYwOmlkZW50aXR5L215NG1saWZlLmNvbWAsXG4gICAgICAgIF0sXG4gICAgICB9KSxcbiAgICApO1xuXG4gICAgLy8gSFRUUCBBUElcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ3d2Mi5IdHRwQXBpKHRoaXMsICdMZWFkQ2FwdHVyZUFwaScsIHtcbiAgICAgIGFwaU5hbWU6ICdNeTRNTGlmZUxlYWRDYXB0dXJlJyxcbiAgICAgIGNvcnNQcmVmbGlnaHQ6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbXG4gICAgICAgICAgJ2h0dHBzOi8vd3d3Lm15NG1saWZlLmNvbScsXG4gICAgICAgICAgJ2h0dHBzOi8vbXk0bWxpZmUuY29tJyxcbiAgICAgICAgICAnaHR0cHM6Ly9hcHAubXk0bWxpZmUuY29tJyxcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDo0MzIxJyxcbiAgICAgICAgXSxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbYXBpZ3d2Mi5Db3JzSHR0cE1ldGhvZC5QT1NULCBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLk9QVElPTlNdLFxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJ10sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgaW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTZW5kQXBwTGlua0ludGVncmF0aW9uJywgc2VuZEFwcExpbmspO1xuXG4gICAgYXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2FwaS9zZW5kLWFwcC1saW5rJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbixcbiAgICB9KTtcblxuICAgIC8vIEJhc2ljIHRocm90dGxpbmcgdmlhIGRlZmF1bHQgc3RhZ2VcbiAgICBjb25zdCBkZWZhdWx0U3RhZ2UgPSBhcGkuZGVmYXVsdFN0YWdlPy5ub2RlLmRlZmF1bHRDaGlsZCBhcyBhcGlnd3YyLkNmblN0YWdlO1xuICAgIGlmIChkZWZhdWx0U3RhZ2UpIHtcbiAgICAgIGRlZmF1bHRTdGFnZS5kZWZhdWx0Um91dGVTZXR0aW5ncyA9IHtcbiAgICAgICAgdGhyb3R0bGluZ1JhdGVMaW1pdDogMTAsXG4gICAgICAgIHRocm90dGxpbmdCdXJzdExpbWl0OiA1MCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xlYWRDYXB0dXJlQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGFwaS5hcGlFbmRwb2ludCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnTXk0TUxpZmUgTGVhZCBDYXB0dXJlIEFQSSBlbmRwb2ludCcsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==