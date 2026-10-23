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
exports.AuthStack = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
/**
 * AuthStack — passwordless Cognito (email-OTP via custom-auth flow)
 * + IdentityPool + Admins group + Lambda triggers.
 *
 * Cognito stores ONLY email. All other profile data lives in DynamoDB.
 */
class AuthStack extends cdk.Stack {
    userPool;
    userPoolClient;
    identityPool;
    constructor(scope, id, props) {
        super(scope, id, props);
        const lambdaDir = path.join(__dirname, '..', 'lambdas', 'auth');
        const mkFn = (name, file) => new aws_lambda_nodejs_1.NodejsFunction(this, name, {
            entry: path.join(lambdaDir, file),
            handler: 'handler',
            runtime: aws_lambda_1.Runtime.NODEJS_24_X,
            bundling: { target: 'node24', minify: false, sourceMap: true },
        });
        const defineAuthChallenge = mkFn('DefineAuthChallengeFn', 'define-auth-challenge.ts');
        const createAuthChallenge = mkFn('CreateAuthChallengeFn', 'create-auth-challenge.ts');
        const verifyAuthChallenge = mkFn('VerifyAuthChallengeFn', 'verify-auth-challenge.ts');
        const postConfirmation = mkFn('PostConfirmationFn', 'post-confirmation.ts');
        const postAuthentication = mkFn('PostAuthenticationFn', 'post-authentication.ts');
        // Email: createAuthChallenge invokes my4mlife-email-sender (Mailgun-backed).
        createAuthChallenge.addEnvironment('EMAIL_SENDER_FN', 'my4mlife-email-sender');
        createAuthChallenge.addToRolePolicy(new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [
                `arn:aws:lambda:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:function:my4mlife-email-sender`,
            ],
        }));
        // Wire Users table env var + permissions if provided.
        if (props?.usersTable) {
            const tableName = props.usersTable.tableName;
            postConfirmation.addEnvironment('USERS_TABLE', tableName);
            postAuthentication.addEnvironment('USERS_TABLE', tableName);
            props.usersTable.grantReadWriteData(postConfirmation);
            props.usersTable.grantReadWriteData(postAuthentication);
        }
        // Contact capture: post-confirmation upserts via UpdateItem only.
        postConfirmation.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:UpdateItem'],
            resources: [
                props?.contactTable?.tableArn ??
                    `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/Contact`,
            ],
        }));
        // UserPool — email-only, passwordless via custom auth.
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'clientportal-users',
            signInAliases: { email: true },
            signInCaseSensitive: false,
            autoVerify: { email: true },
            standardAttributes: {
                email: { required: true, mutable: true },
            },
            // No name, phone, address, or custom attributes — DDB owns profile data.
            selfSignUpEnabled: true,
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            lambdaTriggers: {
                defineAuthChallenge,
                createAuthChallenge,
                verifyAuthChallengeResponse: verifyAuthChallenge,
                postConfirmation,
                postAuthentication,
            },
        });
        // App client — custom-auth ONLY. No password / SRP.
        this.userPoolClient = this.userPool.addClient('AppClient', {
            authFlows: { custom: true },
            generateSecret: false,
            preventUserExistenceErrors: true,
        });
        // Admins group.
        new cognito.CfnUserPoolGroup(this, 'AdminsGroup', {
            userPoolId: this.userPool.userPoolId,
            groupName: 'Admins',
            description: 'Administrative users for the client portal',
        });
        // Identity pool federated to the user pool.
        this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
            identityPoolName: 'clientportal_identity_pool',
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [
                {
                    clientId: this.userPoolClient.userPoolClientId,
                    providerName: this.userPool.userPoolProviderName,
                },
            ],
        });
        const principal = (amr) => new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
            StringEquals: {
                'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
            },
            'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': amr },
        }, 'sts:AssumeRoleWithWebIdentity');
        const authRole = new iam.Role(this, 'AuthenticatedRole', {
            assumedBy: principal('authenticated'),
        });
        const unauthRole = new iam.Role(this, 'UnauthenticatedRole', {
            assumedBy: principal('unauthenticated'),
        });
        new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoles', {
            identityPoolId: this.identityPool.ref,
            roles: {
                authenticated: authRole.roleArn,
                unauthenticated: unauthRole.roleArn,
            },
        });
        new cdk.CfnOutput(this, 'userPoolId', { value: this.userPool.userPoolId });
        new cdk.CfnOutput(this, 'userPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
        });
        new cdk.CfnOutput(this, 'identityPoolId', { value: this.identityPool.ref });
    }
}
exports.AuthStack = AuthStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dGgtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLGlEQUFtQztBQUVuQyxpRUFBbUQ7QUFFbkQseURBQTJDO0FBQzNDLHVEQUFpRDtBQUNqRCxxRUFBK0Q7QUFPL0Q7Ozs7O0dBS0c7QUFDSCxNQUFhLFNBQVUsU0FBUSxHQUFHLENBQUMsS0FBSztJQUN0QixRQUFRLENBQW1CO0lBQzNCLGNBQWMsQ0FBeUI7SUFDdkMsWUFBWSxDQUEwQjtJQUV0RCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDaEUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFZLEVBQUUsSUFBWSxFQUFFLEVBQUUsQ0FDMUMsSUFBSSxrQ0FBYyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUU7WUFDN0IsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQztZQUNqQyxPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsb0JBQU8sQ0FBQyxXQUFXO1lBQzVCLFFBQVEsRUFBRSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFO1NBQy9ELENBQUMsQ0FBQztRQUVMLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUM5Qix1QkFBdUIsRUFDdkIsMEJBQTBCLENBQzNCLENBQUM7UUFDRixNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FDOUIsdUJBQXVCLEVBQ3ZC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QUFFLHFCQUFxQixFQUFFO1lBQzNELFNBQVMsRUFBRSxTQUFTLENBQUMsaUJBQWlCLENBQUM7U0FDeEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxPQUFPLENBQUMsNkJBQTZCLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ25FLGNBQWMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUc7WUFDckMsS0FBSyxFQUFFO2dCQUNMLGFBQWEsRUFBRSxRQUFRLENBQUMsT0FBTztnQkFDL0IsZUFBZSxFQUFFLFVBQVUsQ0FBQyxPQUFPO2FBQ3BDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUMsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO1NBQzVDLENBQUMsQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzlFLENBQUM7Q0FDRjtBQXRKRCw4QkFzSkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgUnVudGltZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgTm9kZWpzRnVuY3Rpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXV0aFN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIHVzZXJzVGFibGU/OiBkeW5hbW9kYi5JVGFibGU7XG4gIGNvbnRhY3RUYWJsZT86IGR5bmFtb2RiLklUYWJsZTtcbn1cblxuLyoqXG4gKiBBdXRoU3RhY2sg4oCUIHBhc3N3b3JkbGVzcyBDb2duaXRvIChlbWFpbC1PVFAgdmlhIGN1c3RvbS1hdXRoIGZsb3cpXG4gKiArIElkZW50aXR5UG9vbCArIEFkbWlucyBncm91cCArIExhbWJkYSB0cmlnZ2Vycy5cbiAqXG4gKiBDb2duaXRvIHN0b3JlcyBPTkxZIGVtYWlsLiBBbGwgb3RoZXIgcHJvZmlsZSBkYXRhIGxpdmVzIGluIER5bmFtb0RCLlxuICovXG5leHBvcnQgY2xhc3MgQXV0aFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uVXNlclBvb2xDbGllbnQ7XG4gIHB1YmxpYyByZWFkb25seSBpZGVudGl0eVBvb2w6IGNvZ25pdG8uQ2ZuSWRlbnRpdHlQb29sO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogQXV0aFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGxhbWJkYURpciA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdsYW1iZGFzJywgJ2F1dGgnKTtcbiAgICBjb25zdCBta0ZuID0gKG5hbWU6IHN0cmluZywgZmlsZTogc3RyaW5nKSA9PlxuICAgICAgbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsIG5hbWUsIHtcbiAgICAgICAgZW50cnk6IHBhdGguam9pbihsYW1iZGFEaXIsIGZpbGUpLFxuICAgICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICAgIGJ1bmRsaW5nOiB7IHRhcmdldDogJ25vZGUyMCcsIG1pbmlmeTogZmFsc2UsIHNvdXJjZU1hcDogdHJ1ZSB9LFxuICAgICAgfSk7XG5cbiAgICBjb25zdCBkZWZpbmVBdXRoQ2hhbGxlbmdlID0gbWtGbihcbiAgICAgICdEZWZpbmVBdXRoQ2hhbGxlbmdlRm4nLFxuICAgICAgJ2RlZmluZS1hdXRoLWNoYWxsZW5nZS50cycsXG4gICAgKTtcbiAgICBjb25zdCBjcmVhdGVBdXRoQ2hhbGxlbmdlID0gbWtGbihcbiAgICAgICdDcmVhdGVBdXRoQ2hhbGxlbmdlRm4nLFxuICAgICAgJ2NyZWF0ZS1hdXRoLWNoYWxsZW5nZS50cycsXG4gICAgKTtcbiAgICBjb25zdCB2ZXJpZnlBdXRoQ2hhbGxlbmdlID0gbWtGbihcbiAgICAgICdWZXJpZnlBdXRoQ2hhbGxlbmdlRm4nLFxuICAgICAgJ3ZlcmlmeS1hdXRoLWNoYWxsZW5nZS50cycsXG4gICAgKTtcbiAgICBjb25zdCBwb3N0Q29uZmlybWF0aW9uID0gbWtGbihcbiAgICAgICdQb3N0Q29uZmlybWF0aW9uRm4nLFxuICAgICAgJ3Bvc3QtY29uZmlybWF0aW9uLnRzJyxcbiAgICApO1xuICAgIGNvbnN0IHBvc3RBdXRoZW50aWNhdGlvbiA9IG1rRm4oXG4gICAgICAnUG9zdEF1dGhlbnRpY2F0aW9uRm4nLFxuICAgICAgJ3Bvc3QtYXV0aGVudGljYXRpb24udHMnLFxuICAgICk7XG5cbiAgICAvLyBFbWFpbDogY3JlYXRlQXV0aENoYWxsZW5nZSBpbnZva2VzIG15NG1saWZlLWVtYWlsLXNlbmRlciAoTWFpbGd1bi1iYWNrZWQpLlxuICAgIGNyZWF0ZUF1dGhDaGFsbGVuZ2UuYWRkRW52aXJvbm1lbnQoJ0VNQUlMX1NFTkRFUl9GTicsICdteTRtbGlmZS1lbWFpbC1zZW5kZXInKTtcbiAgICBjcmVhdGVBdXRoQ2hhbGxlbmdlLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogWydsYW1iZGE6SW52b2tlRnVuY3Rpb24nXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgYGFybjphd3M6bGFtYmRhOiR7Y2RrLlN0YWNrLm9mKHRoaXMpLnJlZ2lvbn06JHtjZGsuU3RhY2sub2YodGhpcykuYWNjb3VudH06ZnVuY3Rpb246bXk0bWxpZmUtZW1haWwtc2VuZGVyYCxcbiAgICAgICAgXSxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICAvLyBXaXJlIFVzZXJzIHRhYmxlIGVudiB2YXIgKyBwZXJtaXNzaW9ucyBpZiBwcm92aWRlZC5cbiAgICBpZiAocHJvcHM/LnVzZXJzVGFibGUpIHtcbiAgICAgIGNvbnN0IHRhYmxlTmFtZSA9IHByb3BzLnVzZXJzVGFibGUudGFibGVOYW1lO1xuICAgICAgcG9zdENvbmZpcm1hdGlvbi5hZGRFbnZpcm9ubWVudCgnVVNFUlNfVEFCTEUnLCB0YWJsZU5hbWUpO1xuICAgICAgcG9zdEF1dGhlbnRpY2F0aW9uLmFkZEVudmlyb25tZW50KCdVU0VSU19UQUJMRScsIHRhYmxlTmFtZSk7XG4gICAgICBwcm9wcy51c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShwb3N0Q29uZmlybWF0aW9uKTtcbiAgICAgIHByb3BzLnVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHBvc3RBdXRoZW50aWNhdGlvbik7XG4gICAgfVxuXG4gICAgLy8gQ29udGFjdCBjYXB0dXJlOiBwb3N0LWNvbmZpcm1hdGlvbiB1cHNlcnRzIHZpYSBVcGRhdGVJdGVtIG9ubHkuXG4gICAgcG9zdENvbmZpcm1hdGlvbi5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFsnZHluYW1vZGI6VXBkYXRlSXRlbSddLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBwcm9wcz8uY29udGFjdFRhYmxlPy50YWJsZUFybiA/P1xuICAgICAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufToke2Nkay5TdGFjay5vZih0aGlzKS5hY2NvdW50fTp0YWJsZS9Db250YWN0YCxcbiAgICAgICAgXSxcbiAgICAgIH0pLFxuICAgICk7XG5cbiAgICAvLyBVc2VyUG9vbCDigJQgZW1haWwtb25seSwgcGFzc3dvcmRsZXNzIHZpYSBjdXN0b20gYXV0aC5cbiAgICB0aGlzLnVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1VzZXJQb29sJywge1xuICAgICAgdXNlclBvb2xOYW1lOiAnY2xpZW50cG9ydGFsLXVzZXJzJyxcbiAgICAgIHNpZ25JbkFsaWFzZXM6IHsgZW1haWw6IHRydWUgfSxcbiAgICAgIHNpZ25JbkNhc2VTZW5zaXRpdmU6IGZhbHNlLFxuICAgICAgYXV0b1ZlcmlmeTogeyBlbWFpbDogdHJ1ZSB9LFxuICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XG4gICAgICAgIGVtYWlsOiB7IHJlcXVpcmVkOiB0cnVlLCBtdXRhYmxlOiB0cnVlIH0sXG4gICAgICB9LFxuICAgICAgLy8gTm8gbmFtZSwgcGhvbmUsIGFkZHJlc3MsIG9yIGN1c3RvbSBhdHRyaWJ1dGVzIOKAlCBEREIgb3ducyBwcm9maWxlIGRhdGEuXG4gICAgICBzZWxmU2lnblVwRW5hYmxlZDogdHJ1ZSxcbiAgICAgIGFjY291bnRSZWNvdmVyeTogY29nbml0by5BY2NvdW50UmVjb3ZlcnkuRU1BSUxfT05MWSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICAgIGxhbWJkYVRyaWdnZXJzOiB7XG4gICAgICAgIGRlZmluZUF1dGhDaGFsbGVuZ2UsXG4gICAgICAgIGNyZWF0ZUF1dGhDaGFsbGVuZ2UsXG4gICAgICAgIHZlcmlmeUF1dGhDaGFsbGVuZ2VSZXNwb25zZTogdmVyaWZ5QXV0aENoYWxsZW5nZSxcbiAgICAgICAgcG9zdENvbmZpcm1hdGlvbixcbiAgICAgICAgcG9zdEF1dGhlbnRpY2F0aW9uLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEFwcCBjbGllbnQg4oCUIGN1c3RvbS1hdXRoIE9OTFkuIE5vIHBhc3N3b3JkIC8gU1JQLlxuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSB0aGlzLnVzZXJQb29sLmFkZENsaWVudCgnQXBwQ2xpZW50Jywge1xuICAgICAgYXV0aEZsb3dzOiB7IGN1c3RvbTogdHJ1ZSB9LFxuICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLFxuICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBBZG1pbnMgZ3JvdXAuXG4gICAgbmV3IGNvZ25pdG8uQ2ZuVXNlclBvb2xHcm91cCh0aGlzLCAnQWRtaW5zR3JvdXAnLCB7XG4gICAgICB1c2VyUG9vbElkOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXG4gICAgICBncm91cE5hbWU6ICdBZG1pbnMnLFxuICAgICAgZGVzY3JpcHRpb246ICdBZG1pbmlzdHJhdGl2ZSB1c2VycyBmb3IgdGhlIGNsaWVudCBwb3J0YWwnLFxuICAgIH0pO1xuXG4gICAgLy8gSWRlbnRpdHkgcG9vbCBmZWRlcmF0ZWQgdG8gdGhlIHVzZXIgcG9vbC5cbiAgICB0aGlzLmlkZW50aXR5UG9vbCA9IG5ldyBjb2duaXRvLkNmbklkZW50aXR5UG9vbCh0aGlzLCAnSWRlbnRpdHlQb29sJywge1xuICAgICAgaWRlbnRpdHlQb29sTmFtZTogJ2NsaWVudHBvcnRhbF9pZGVudGl0eV9wb29sJyxcbiAgICAgIGFsbG93VW5hdXRoZW50aWNhdGVkSWRlbnRpdGllczogZmFsc2UsXG4gICAgICBjb2duaXRvSWRlbnRpdHlQcm92aWRlcnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNsaWVudElkOiB0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICAgICAgcHJvdmlkZXJOYW1lOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sUHJvdmlkZXJOYW1lLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHByaW5jaXBhbCA9IChhbXI6ICdhdXRoZW50aWNhdGVkJyB8ICd1bmF1dGhlbnRpY2F0ZWQnKSA9PlxuICAgICAgbmV3IGlhbS5GZWRlcmF0ZWRQcmluY2lwYWwoXG4gICAgICAgICdjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb20nLFxuICAgICAgICB7XG4gICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XG4gICAgICAgICAgICAnY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmF1ZCc6IHRoaXMuaWRlbnRpdHlQb29sLnJlZixcbiAgICAgICAgICB9LFxuICAgICAgICAgICdGb3JBbnlWYWx1ZTpTdHJpbmdMaWtlJzogeyAnY29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOmFtcic6IGFtciB9LFxuICAgICAgICB9LFxuICAgICAgICAnc3RzOkFzc3VtZVJvbGVXaXRoV2ViSWRlbnRpdHknLFxuICAgICAgKTtcblxuICAgIGNvbnN0IGF1dGhSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdBdXRoZW50aWNhdGVkUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogcHJpbmNpcGFsKCdhdXRoZW50aWNhdGVkJyksXG4gICAgfSk7XG4gICAgY29uc3QgdW5hdXRoUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnVW5hdXRoZW50aWNhdGVkUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogcHJpbmNpcGFsKCd1bmF1dGhlbnRpY2F0ZWQnKSxcbiAgICB9KTtcblxuICAgIG5ldyBjb2duaXRvLkNmbklkZW50aXR5UG9vbFJvbGVBdHRhY2htZW50KHRoaXMsICdJZGVudGl0eVBvb2xSb2xlcycsIHtcbiAgICAgIGlkZW50aXR5UG9vbElkOiB0aGlzLmlkZW50aXR5UG9vbC5yZWYsXG4gICAgICByb2xlczoge1xuICAgICAgICBhdXRoZW50aWNhdGVkOiBhdXRoUm9sZS5yb2xlQXJuLFxuICAgICAgICB1bmF1dGhlbnRpY2F0ZWQ6IHVuYXV0aFJvbGUucm9sZUFybixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAndXNlclBvb2xJZCcsIHsgdmFsdWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAndXNlclBvb2xDbGllbnRJZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ2lkZW50aXR5UG9vbElkJywgeyB2YWx1ZTogdGhpcy5pZGVudGl0eVBvb2wucmVmIH0pO1xuICB9XG59XG4iXX0=